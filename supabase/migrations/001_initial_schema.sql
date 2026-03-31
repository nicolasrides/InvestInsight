-- InvestInsight — Initial Schema
-- Run against a Supabase project (PostgreSQL).
-- Supabase provides auth.users automatically.
--
-- All tables are created first, then all RLS policies.
-- This avoids forward-reference errors between tables.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  display_name    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_organization_id_idx ON profiles(organization_id);

CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name            text NOT NULL,
  description     text,
  currency        text NOT NULL DEFAULT 'EUR',
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  created_by      uuid NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  archived_at     timestamptz
);

CREATE INDEX plans_organization_id_idx ON plans(organization_id);

CREATE TABLE plan_collaborators (
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  uuid REFERENCES profiles(id),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, profile_id)
);

CREATE INDEX plan_collaborators_profile_id_idx ON plan_collaborators(profile_id);

CREATE TABLE activities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name                text NOT NULL DEFAULT 'New Activity',
  lifecycle_status    text NOT NULL DEFAULT 'created'
                        CHECK (lifecycle_status IN ('created', 'active', 'evaluated', 'archived')),
  outcome_status      text,
  time_planned        numeric,
  investment_planned  numeric,
  return_planned      numeric,
  time_actual         numeric,
  investment_actual   numeric,
  return_actual       numeric,
  position_x          numeric NOT NULL DEFAULT 0,
  position_y          numeric NOT NULL DEFAULT 0,
  created_by          uuid NOT NULL REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activities_plan_id_idx ON activities(plan_id);

CREATE TABLE activity_edges (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  from_activity_id    uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  to_activity_id      uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  condition_label     text NOT NULL,
  created_by          uuid NOT NULL REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT no_self_loop CHECK (from_activity_id <> to_activity_id),
  UNIQUE (from_activity_id, to_activity_id, condition_label)
);

CREATE INDEX activity_edges_plan_id_idx  ON activity_edges(plan_id);
CREATE INDEX activity_edges_from_id_idx  ON activity_edges(from_activity_id);
CREATE INDEX activity_edges_to_id_idx    ON activity_edges(to_activity_id);

CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  actor_id      uuid NOT NULL REFERENCES profiles(id),
  entity_type   text NOT NULL
                  CHECK (entity_type IN ('plan', 'activity', 'edge', 'collaborator')),
  entity_id     uuid NOT NULL,
  action        text NOT NULL
                  CHECK (action IN ('create', 'update', 'delete')),
  field_name    text,
  old_value     jsonb,
  new_value     jsonb,
  comment       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_plan_id_idx    ON audit_log(plan_id);
CREATE INDEX audit_log_entity_id_idx  ON audit_log(entity_id);
CREATE INDEX audit_log_created_at_idx ON audit_log(plan_id, created_at DESC);

CREATE TABLE plan_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  email       text NOT NULL,
  invited_by  uuid NOT NULL REFERENCES profiles(id),
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'declined')),
  token       text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),

  UNIQUE (plan_id, email)
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- All policies defined here, after all tables exist.
-- ============================================================

ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_collaborators   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_edges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_invitations     ENABLE ROW LEVEL SECURITY;

-- profiles: visible only within the same organization
CREATE POLICY "profiles: same org read"
  ON profiles FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "profiles: own row update"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- plans: accessible only if the user is a collaborator
CREATE POLICY "plans: collaborator access"
  ON plans FOR ALL
  USING (
    id IN (
      SELECT plan_id FROM plan_collaborators WHERE profile_id = auth.uid()
    )
  );

-- plan_collaborators
CREATE POLICY "plan_collaborators: collaborator access"
  ON plan_collaborators FOR ALL
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_collaborators WHERE profile_id = auth.uid()
    )
  );

-- activities
CREATE POLICY "activities: collaborator access"
  ON activities FOR ALL
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_collaborators WHERE profile_id = auth.uid()
    )
  );

-- activity_edges
CREATE POLICY "activity_edges: collaborator access"
  ON activity_edges FOR ALL
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_collaborators WHERE profile_id = auth.uid()
    )
  );

-- audit_log: collaborators can read; inserts allowed from the client
CREATE POLICY "audit_log: collaborator read"
  ON audit_log FOR SELECT
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_collaborators WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "audit_log: collaborator insert"
  ON audit_log FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT plan_id FROM plan_collaborators WHERE profile_id = auth.uid()
    )
  );

-- plan_invitations
CREATE POLICY "plan_invitations: collaborator access"
  ON plan_invitations FOR ALL
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_collaborators WHERE profile_id = auth.uid()
    )
  );

-- Allow unauthenticated token lookup (for accepting an invite link)
CREATE POLICY "plan_invitations: token lookup"
  ON plan_invitations FOR SELECT
  USING (true);
