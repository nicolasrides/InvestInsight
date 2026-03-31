# InvestInsight — Data Model

**Status:** Draft
**Date:** 2026-03-30

---

## Entity Overview

```
organizations
  └── profiles (users)
  └── plans
        └── plan_collaborators  (profiles ↔ plans)
        └── activities          (graph nodes)
        └── activity_edges      (graph edges, from → to with condition_label)
        └── audit_log           (every change, supports undo)
        └── plan_invitations    (pending email invites)
```

---

## Design Decisions

**Derived graph state — not stored.**
An activity's visual state (Active, Locked, Closed) is computed at read time from the graph topology and upstream `outcome_status` values. It is not persisted. Root nodes (no incoming edges) are always Active. A node is Locked if no upstream outcome matches any of its incoming edge condition labels. A node is Closed if all paths to it are closed.

**Outcome status is a free-text string.**
Edge condition labels (`pass`, `fail`, `low`, `high`, etc.) are user-defined. The activity `outcome_status` is a matching free-text field. No DB-level validation against edge labels — the application enforces this.

**Audit log is the undo stack.**
Every mutation records `old_value` / `new_value` as JSONB. Undo replays these entries in reverse. This is append-only — the audit log is never mutated after write.

**Multi-tenant isolation at the data layer.**
Every Plan belongs to an Organization. Row Level Security (RLS) policies enforce that queries from a profile session can only reach rows in that profile's organization. No UI-layer filtering is sufficient.

**Plan creator is inserted into `plan_collaborators`.**
`plans.created_by` records authorship. Actual access is via `plan_collaborators`. The creator is always inserted as a collaborator on plan creation.

**Currency stored at the plan level.**
All activity amounts (investment, return) within a plan share the plan's currency. No per-activity currency field.

**Position stored on the activity.**
Canvas x/y coordinates are part of the activity row. Position changes are recorded in the audit log like any other field change.

---

## SQL Schema

```sql
-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES  (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  display_name    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_organization_id_idx ON profiles(organization_id);

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name            text NOT NULL,
  description     text,
  currency        text NOT NULL DEFAULT 'EUR',  -- ISO 4217
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  created_by      uuid NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  archived_at     timestamptz
);

CREATE INDEX plans_organization_id_idx ON plans(organization_id);

-- ============================================================
-- PLAN COLLABORATORS
-- ============================================================
CREATE TABLE plan_collaborators (
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  uuid REFERENCES profiles(id),  -- NULL if plan creator
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, profile_id)
);

CREATE INDEX plan_collaborators_profile_id_idx ON plan_collaborators(profile_id);

-- ============================================================
-- ACTIVITIES  (graph nodes)
-- ============================================================
CREATE TABLE activities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name                text NOT NULL DEFAULT 'New Activity',

  -- Lifecycle: human-driven progression through stages
  lifecycle_status    text NOT NULL DEFAULT 'created'
                        CHECK (lifecycle_status IN ('created', 'active', 'evaluated', 'archived')),

  -- Outcome: set by a collaborator when lifecycle_status = 'evaluated'
  -- Must match a condition_label on an outgoing edge to unlock downstream nodes
  -- NULL until the activity has been evaluated
  outcome_status      text,

  -- Planned values (all NULL until the user fills them in)
  time_planned        numeric,          -- days
  investment_planned  numeric,          -- plan currency
  return_planned      numeric,          -- plan currency

  -- Actual values (filled in during/after execution)
  time_actual         numeric,
  investment_actual   numeric,
  return_actual       numeric,

  -- Canvas layout — stored here, treated as a regular field in the audit log
  position_x          numeric NOT NULL DEFAULT 0,
  position_y          numeric NOT NULL DEFAULT 0,

  created_by          uuid NOT NULL REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activities_plan_id_idx ON activities(plan_id);

-- ============================================================
-- ACTIVITY EDGES  (graph edges)
-- ============================================================
-- Each edge represents: "from_activity_id → to_activity_id if outcome = condition_label"
-- Multiple edges between the same pair are allowed with different condition labels
-- (e.g. A → B on 'pass' AND A → B on 'high' means either outcome unlocks B)
CREATE TABLE activity_edges (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  from_activity_id    uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  to_activity_id      uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  condition_label     text NOT NULL,   -- e.g. 'pass', 'fail', 'low', 'high'
  created_by          uuid NOT NULL REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT no_self_loop CHECK (from_activity_id <> to_activity_id),
  UNIQUE (from_activity_id, to_activity_id, condition_label)
);

CREATE INDEX activity_edges_plan_id_idx     ON activity_edges(plan_id);
CREATE INDEX activity_edges_from_id_idx     ON activity_edges(from_activity_id);
CREATE INDEX activity_edges_to_id_idx       ON activity_edges(to_activity_id);

-- ============================================================
-- AUDIT LOG  (append-only — every change is a row)
-- ============================================================
-- Used for: change history display, undo, optional comments on changes
-- Undo applies old_value entries in reverse creation order
CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  actor_id      uuid NOT NULL REFERENCES profiles(id),

  entity_type   text NOT NULL
                  CHECK (entity_type IN ('plan', 'activity', 'edge', 'collaborator')),
  entity_id     uuid NOT NULL,

  action        text NOT NULL
                  CHECK (action IN ('create', 'update', 'delete')),

  -- For 'update': which field changed and its before/after values
  -- For 'create'/'delete': new_value / old_value holds the full entity snapshot
  field_name    text,
  old_value     jsonb,
  new_value     jsonb,

  -- Optional comment the actor attaches to this specific change
  comment       text,

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_plan_id_idx     ON audit_log(plan_id);
CREATE INDEX audit_log_entity_id_idx   ON audit_log(entity_id);
CREATE INDEX audit_log_created_at_idx  ON audit_log(plan_id, created_at DESC);

-- ============================================================
-- PLAN INVITATIONS
-- ============================================================
CREATE TABLE plan_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  email       text NOT NULL,
  invited_by  uuid NOT NULL REFERENCES profiles(id),
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'declined')),
  token       text NOT NULL UNIQUE,  -- secure random token for invite link
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),

  UNIQUE (plan_id, email)  -- one active invite per email per plan
);
```

---

## Derived Graph State

The visual state of each activity node is computed, never stored. Given a plan's full activities + edges loaded into memory:

| Condition | Visual State |
|---|---|
| `lifecycle_status = 'archived'` | **Archived** (grey, completed) |
| No incoming edges (root node) | **Active** (unlocked) |
| Any incoming edge where `upstream.outcome_status = edge.condition_label` | **Active** (unlocked) |
| Has incoming edges, none of them activated | **Locked** (waiting on upstream) |
| All paths to this node are closed | **Closed** (grey, excluded path) |

A "closed" path: upstream activity's `outcome_status` is set but does not match the edge's `condition_label`. Any node reachable only via closed edges is Closed.

---

## Row Level Security (RLS) Sketch

Supabase RLS enforces multi-tenant isolation. Core policies:

```sql
-- Profiles can only be read within the same organization
-- Plans: accessible only if profile is a collaborator
-- Activities / edges / audit_log: accessible only via plan access
-- Plan invitations: accessible only to plan collaborators

-- Example policy on plans:
CREATE POLICY "collaborators can access plan"
ON plans FOR ALL
USING (
  id IN (
    SELECT plan_id FROM plan_collaborators
    WHERE profile_id = auth.uid()
  )
);

-- Organization-scoped isolation on profiles:
CREATE POLICY "same org only"
ON profiles FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);
```

All child tables (activities, edges, audit_log) inherit plan access — policies check `plan_id IN (SELECT plan_id FROM plan_collaborators WHERE profile_id = auth.uid())`.

---

## Open Questions

1. **Time unit for `time_planned` / `time_actual`:** Days assumed. Should the app let users choose (days/weeks/months)? Simplest: always days, display as weeks in the UI if > 14.
2. **Soft delete vs hard delete for activities:** Deleting a node cascades to its edges. Is that acceptable, or should activities be soft-deleted (archived) so the audit trail remains coherent? Recommend soft delete — add `deleted_at timestamptz` and filter it out.
3. **Graph cycle prevention:** A directed cycle (A → B → A) is logically invalid. Enforce at the application layer before inserting an edge, or add a DB trigger? Application layer preferred to avoid expensive recursive checks in the DB.
4. **Plan-level currency:** Amounts are stored as plain `numeric`. Should the schema include a `currency` column on plans (already added, defaulting to `EUR`) and enforce display formatting in the UI only? Yes — this is the current design.
