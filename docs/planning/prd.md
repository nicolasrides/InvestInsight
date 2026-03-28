---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: ['docs/brainstorming/brainstorming-session-2026-03-23.md']
workflowType: 'prd'
workflow_completed: true
classification:
  projectType: web_app
  domain: fintech
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - InvestInsight

**Author:** Nicolas Rides
**Date:** 2026-03-28

---

## Executive Summary

InvestInsight is a web-based investment management application (PWA) that replaces binary invest/don't-invest decisions with a structured, incremental, milestone-driven investment process. It targets initiative owners, co-founders, investment teams, and any stakeholder participating in phased capital allocation decisions — product development, market entries, R&D programs, or any initiative where capital deployment should be conditional on outcomes.

The core model is a **directed conditional graph** of Activities. Each Activity represents a discrete investment phase with planned and actual tracking across time, capital, and return. Activities are connected by conditional edges — status labels that define under which outcome a downstream activity is unlocked. A plan is not a task list; it is a decision tree capturing every possible path an investment initiative can take.

**The problem solved:** Investment decisions are made with too little structure and too much intuition. Plans created in spreadsheets don't model conditionality, and post-mortems are reconstructed from memory. InvestInsight makes the decision process itself the artifact — visible, auditable, and reusable.

### What Makes This Special

**The graph is the differentiator.** No spreadsheet or project management tool models conditional investment paths. The visual graph gives every stakeholder an immediate, unambiguous picture of the entire investment landscape — what has been decided, what is in flight, and what remains conditional on outcomes yet to be evaluated.

**The status gate is the philosophy.** After each Activity completes, a human deliberates and sets the outcome status. This single action unlocks or closes downstream paths. The app does not automate this decision — it waits for it. InvestInsight is built for the decision process, not around it.

**The plan writes its own history.** Every change is logged with author, timestamp, and optional comment. The completed plan is the post-mortem. No report needs to be written.

**Transparency by default.** All stakeholders have full read and edit access. No role-based silos. The audit trail is the trust mechanism. A frozen node — one where collaborators cannot agree on a status — is not a failure state; it is forced alignment.

---

## Design Principles

These principles govern UX and interaction decisions across the product:

**Emotion-free presentation.** The app presents outcomes neutrally — no celebratory animations on pass, no alarm states on fail. Status changes produce clear visual state transitions, not emotional reactions. The product succeeds when it disappears and only the truth remains.

**Clarity over engagement.** InvestInsight is not designed to make users feel engaged or excited. It is designed to make users feel informed. Every interaction should reduce cognitive noise, not add to it.

**The Calibration Loop.** Each completed archived plan is a benchmark. The variance between planned and actual values on past activities should inform future estimates. This principle guides what the product surfaces to users over time — not analytics dashboards, but direct access to their own history.

---

## Success Criteria

### User Success

- A user builds their first conditional graph with 3+ activities and at least one branch without needing documentation
- A user completes an activity, sets its status, and immediately understands which downstream activities unlocked or closed — no explanation required
- A user opens a completed archived plan and can reconstruct every decision made from the graph, audit trail, and comments alone
- All collaborators on a plan share the same real-time view with no sync lag visible to the user

### Business Success

- Primary metric: **usage** — plans created, activities progressed, status gates set
- First 3 months: active usage by real teams on real initiatives
- No monetization target for MVP — usage data informs future pricing model

### Technical Success

- Graph editing (add, remove, update nodes and edges) responds within 1 second
- Real-time collaboration functional across all stakeholders on a plan
- Full undo history operational back to plan creation
- Audit trail captures every change with author, timestamp, and optional comment
- Full functionality on desktop and mobile browsers

### Measurable Outcomes

- Sub-second response for all graph add/remove/update operations
- Zero data loss — every change is preserved and recoverable
- A completed plan requires no external documentation to be understood

---

## Product Scope

### MVP — Minimum Viable Product

- Conditional activity graph with full graph-first editing (add, remove, connect, label edges)
- Activity fields: name, time planned/actual, investment planned/actual, return planned/actual
- Plan-level variance rollup — total planned vs. actual across all activities
- Activity lifecycle: Created → Active → Evaluated → Archived
- Manual status gating — human sets outcome status, unlocking downstream activities
- Full collaborative access — all stakeholders read and edit, no role-based restrictions
- Real-time sync across all collaborators
- Audit trail with optional comments anchored to specific changes
- Full undo history back to plan creation
- Multi-tenant data isolation — organizations cannot see each other's plans
- Cross-platform PWA (desktop + mobile, modern browsers only)

### Growth Features (Phase 2)

- Public read-only live plan link (shareable without account)
- Notifications and status change alerts
- Reusable activity templates (personal library)
- Document attachments per activity node

### Vision (Phase 3)

- Plan Simulator — forward simulation of all possible outcome paths
- Monetization model (freemium or subscription)
- Organization-level plan library
- Template marketplace

---

## User Journeys

### Journey 1: The Initiative Owner — Launching a Plan

**Meet Thomas.** He's a co-founder about to begin a market validation initiative. Every time he's tried to plan this in a spreadsheet, the plan becomes obsolete the moment the first assumption fails. His team keeps asking "what's next?" and he keeps improvising the answer.

**Opening scene:** Thomas opens InvestInsight and creates a new Plan — "Market Validation 2026." He adds his first Activity: "Build Prototype" — €15k planned, 30 days. He adds a second Activity: "User Testing" — €5k, 15 days. He draws an edge from the first to the second, labels it "pass." He adds a third Activity: "Pivot Prototype" — labels the edge from Activity 1 "fail." The graph now shows two possible paths depending on the prototype outcome.

**Rising action:** He invites his co-founder Sophie and their advisor Marc as collaborators. They all see the same graph. Sophie updates the investment on "User Testing" to €8k — she adds a comment: "added UX researcher cost." Thomas sees the change in real time. No email thread, no version conflict.

**Climax:** Six weeks later, the prototype is done. Thomas sets the status to "pass." The "User Testing" node lights up — unlocked. The "Pivot Prototype" node greys out — closed. The team sees the path ahead instantly. No meeting needed.

**Resolution:** Thomas has a living plan that reflects reality, not the original hope. Every branch taken and closed is visible. The plan is writing its own history.

*Requirements revealed: plan creation, activity CRUD, edge creation with status labels, real-time collaboration, status gating, graph visual state (active/locked/closed)*

---

### Journey 2: The Collaborator — The Status Disagreement

**Meet Sophie.** She's Thomas's co-founder and collaborator on the plan — technically strong, doesn't always share Thomas's optimism about milestone outcomes.

**Opening scene:** Thomas sets the Activity status to "pass" after user tests. Sophie disagrees — conversion was below target. She changes the status to "low" and adds a comment: "conversion at 12%, target was 20% — I'd call this low, not pass."

**Rising action:** The node is in dispute. Downstream activities remain locked. The graph shows a frozen node — not an error, just reality: the team hasn't reached alignment.

**Climax:** Thomas and Sophie have the conversation they needed to have. They agree: "low" is the right status. Thomas updates it. "Adjust Positioning" unlocks. The wrong path stays closed.

**Resolution:** The graph forced the conversation before capital was deployed in the wrong direction. The audit trail shows the full decision history. No blame, just process.

*Requirements revealed: status change by any collaborator, optional comments on changes, audit trail, frozen node state, conflict resolution through conversation not system override*

---

### Journey 3: The New Stakeholder — Reading a Completed Plan

**Meet Amir.** He's a potential investor Thomas is meeting next week. Thomas shares a completed InvestInsight plan — an initiative from last year that resulted in a successful product launch.

**Opening scene:** Amir opens the plan. Full graph — completed activities in green, closed branches in grey. He wasn't there when it happened. He doesn't need to be.

**Rising action:** He navigates to an activity where a major pivot occurred. He sees planned (€40k, 60 days) vs. actual (€62k, 78 days), and Thomas's comment: "cost overrun due to supplier delay — acceptable given outcome quality." He sees exactly why the pivot was made, who made it, and what it led to.

**Climax:** Amir doesn't need a presentation. The plan IS the pitch — it demonstrates that Thomas's team thinks in conditions, not bets.

**Resolution:** Amir arrives at the meeting already informed. Thomas never had to write a post-mortem report.

*Requirements revealed: read-only plan view for non-collaborators, planned vs actual variance display, audit trail visibility, graph navigation, archived plan state*

---

### Journey Requirements Summary

| Capability | Journeys |
|---|---|
| Plan creation and activity CRUD | J1 |
| Graph-first editing (nodes, edges, labels) | J1 |
| Real-time collaboration with change visibility | J1, J2 |
| Optional comments anchored to changes | J1, J2, J3 |
| Status gating with downstream unlock/close | J1, J2 |
| Frozen node state (no forced resolution) | J2 |
| Full audit trail | J2, J3 |
| Planned vs actual variance display | J3 |
| Archived plan view | J3 |
| Read access for non-collaborators | J3 |

---

## Domain-Specific Requirements

### Compliance & Regulatory

- **GDPR:** Post-launch concern — no personal financial data stored in MVP; only investment plan data (amounts, timelines, outcomes)
- **External compliance reporting:** Not required — built-in audit trail satisfies internal governance needs

### Security Constraints

- **Encryption:** Data encrypted at rest and in transit — no special certification required for MVP
- **Multi-tenant isolation:** Critical — one organization's plans must be completely invisible to other organizations, enforced at the data layer not just the UI layer

---

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. The Conditional Investment Graph**
No existing tool — spreadsheet, project management software, or fintech application — models investment decisions as an interactive conditional directed graph. Decision trees exist in textbooks; InvestInsight makes them operational, collaborative, and executable. The graph is not a visualization of data stored elsewhere — it *is* the data model.

**2. Graph-First Editing Paradigm**
Most tools build a form-based data model and add a graph view as a secondary layer. InvestInsight inverts this: the graph is the primary editing surface. This is a new interaction paradigm — the mental model of "drawing a plan" rather than "filling in a plan."

**3. The Status Gate as Enforced Deliberation**
Most productivity software minimizes friction. InvestInsight deliberately introduces it at the critical moment: no downstream activity unlocks until a human sets the outcome status. No admin override, no auto-progression, no majority vote.

### Market Context & Competitive Landscape

- **Spreadsheets:** No conditionality, no real-time collaboration, no audit trail, no graph
- **PM tools (Jira, Asana, Monday.com):** Linear task tracking, no investment/return tracking, no conditional branching at the decision level
- **Financial planning tools:** Plan-focused not process-focused; model outcomes, not decisions
- **Decision tree tools:** Academic and static; not operational, not collaborative, not executable

InvestInsight occupies an uncontested space: the intersection of investment tracking, conditional planning, and collaborative decision-making.

### Validation Approach

- **Graph model:** Validate with real initiatives run by early adopters — does the graph make the investment path clearer than a spreadsheet?
- **Graph-first editing:** Usability testing on desktop and mobile before launch
- **Status gate:** Qualitative feedback from first cohort; watch for workaround behaviors

### Innovation Risks

- **Graph complexity at scale:** Plans with 20+ activities may become visually overwhelming → zoom, pan, and node grouping required before scaling
- **Mobile graph editing:** Touch-based manipulation is technically the hardest part of MVP → prototype on iOS Safari early
- **Market education:** First completed plan is the best acquisition tool; onboarding must reach first status gate as fast as possible

---

## Web Application Specific Requirements

### Architecture

- **Application model:** SPA with client-side routing — no full page reloads; graph state persists across navigation
- **Real-time layer:** WebSocket-based sync for collaborative editing — collaborators see changes without manual refresh
- **Offline behavior:** Not required for MVP — connectivity required for real-time collaboration
- **Stack:** React + React Flow + Supabase (Realtime + Auth + PostgreSQL) + PWA manifest

### Browser Support

| Browser | Support |
|---|---|
| Chrome (last 2 versions) | ✅ Full support |
| Firefox (last 2 versions) | ✅ Full support |
| Safari (last 2 versions) | ✅ Full support |
| Edge (last 2 versions) | ✅ Full support |
| IE11 / Legacy browsers | ❌ Not supported |

### Responsive Design

- **Desktop (≥1024px):** Primary editing surface — mouse-based node/edge manipulation
- **Tablet (768–1023px):** Full feature parity with touch support
- **Mobile (<768px):** Full feature parity — touch-based manipulation; pinch-to-zoom and drag-to-pan required
- Mobile graph editing is the highest UX risk — prototype and test on iOS Safari before committing to full build

### Accessibility

WCAG 2.1 AA for all non-graph UI elements (forms, navigation, modals, lists). Graph canvas provides keyboard navigation as supplement to mouse/touch.

---

## Project Scoping & Phased Development

### MVP Strategy

**Approach:** Experience MVP — no partial version validates the concept. A conditional graph that can be created, edited, executed through status gates, and reviewed as an archive is the minimum unit of value.

**Build sequence:** Data model and backend first → graph UI → collaboration features. A wrong schema is the most expensive mistake to fix.

**Primary risk:** Adoption — users may not know they need this. Mitigation: onboarding must reach first status gate as fast as possible; completed plans are the acquisition tool.

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| Mobile UX (highest) | Prototype touch interaction on iOS Safari before full build |
| Real-time sync | Use Supabase Realtime; validate with 2 concurrent users before launch |
| Adoption | Onboard to first status gate immediately; completed plans drive word-of-mouth |
| Scope creep | Phase 2 features locked out until Phase 1 shipped and actively used |

---

## Functional Requirements

### Plan Management

- **FR1:** A user can create a new investment Plan with a name and description
- **FR2:** A user can view a list of all Plans they have access to
- **FR3:** A user can archive a completed Plan
- **FR4:** A user can view an archived Plan in read-only mode
- **FR5:** A user can delete a Plan they own

### Graph Editing

- **FR6:** A user can add an Activity node to the Plan graph
- **FR7:** A user can remove an Activity node from the Plan graph
- **FR8:** A user can connect two Activity nodes with a directed edge
- **FR9:** A user can label an edge with a status condition (e.g. pass, fail, low, high)
- **FR10:** A user can remove an edge between two Activity nodes
- **FR11:** A user can reposition Activity nodes on the graph canvas
- **FR12:** A user can zoom and pan the graph canvas
- **FR13:** A user can open an Activity inline from the graph to view and edit its details

### Activity Management

- **FR14:** A user can set and update an Activity's name
- **FR15:** A user can set and update an Activity's planned time, planned investment, and planned return
- **FR16:** A user can set and update an Activity's actual time, actual investment, and actual return
- **FR17:** A user can view the variance between planned and actual values on an Activity
- **FR18:** A user can view plan-level aggregated variance — total planned investment and return vs. total actual across all Activities
- **FR19:** A user can transition an Activity through its lifecycle: Created → Active → Evaluated → Archived

### Status Gating

- **FR20:** Any collaborator can set the outcome status of an Evaluated Activity
- **FR21:** Setting an Activity's status unlocks all downstream Activities whose edge condition matches that status
- **FR22:** Setting an Activity's status closes all downstream Activities whose edge condition does not match
- **FR23:** A downstream Activity remains locked until its upstream Activity's status is set — no auto-progression or override exists
- **FR24:** The graph visually distinguishes between Active, Locked, Closed, and Archived Activity states

### Collaboration

- **FR25:** A Plan owner can invite collaborators by email
- **FR26:** Any collaborator can view the complete Plan graph and all Activity details in real time
- **FR27:** Any collaborator can edit any Activity, edge, or graph element
- **FR28:** All collaborators see graph changes made by others without requiring a page refresh
- **FR29:** A collaborator's changes are visible to all other collaborators within 200ms

### Audit Trail & History

- **FR30:** The system records every change to a Plan — author, timestamp, field changed, old value, new value
- **FR31:** A user can view the complete change history of a Plan
- **FR32:** A user can attach an optional comment to any change they make
- **FR33:** A user can undo any action back to the Plan's creation
- **FR34:** The undo history is shared — any collaborator can view the full history

### User & Organization Management

- **FR35:** A user can register and authenticate with an email and password
- **FR36:** A user belongs to an Organization — Plans are scoped to an Organization
- **FR37:** A user can only access Plans belonging to their own Organization — Plans from other Organizations are never visible, searchable, or accessible regardless of sharing mechanism
- **FR38:** A user can update their profile (name, email)

---

## Non-Functional Requirements

### Performance

- **NFR1:** Graph interactions (add, remove, update node or edge) complete within 1 second under normal network conditions
- **NFR2:** Initial Plan graph renders within 3 seconds on standard broadband
- **NFR3:** Real-time sync delivers collaborator changes to all active sessions within 200ms
- **NFR4:** The application remains responsive on mobile touch interactions with no perceptible canvas gesture lag

### Security

- **NFR5:** All data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- **NFR6:** Multi-tenant isolation enforced at the database layer — no Organization can access another Organization's data through any mechanism (direct query, API, or UI)
- **NFR7:** User sessions expire after inactivity
- **NFR8:** All API endpoints require valid authentication — no unauthenticated access to Plan data

### Reliability

- **NFR9:** Application targets 99.5% uptime — planned maintenance excluded
- **NFR10:** No data loss on network interruption — in-flight changes are either committed or clearly indicated as failed, never silently dropped
- **NFR11:** Undo history is durable — survives page refresh, session expiry, and browser close

### Accessibility

- **NFR12:** WCAG 2.1 AA compliance for all non-graph UI elements (forms, navigation, modals, lists)
- **NFR13:** Graph canvas provides keyboard navigation as supplement to mouse/touch interactions
