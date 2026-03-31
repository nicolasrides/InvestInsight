-- Fix: all policies that query plan_collaborators trigger recursive RLS.
-- Solution: SECURITY DEFINER function that reads plan_collaborators bypassing RLS,
-- used in every policy that needs to check plan membership.

CREATE OR REPLACE FUNCTION get_my_plan_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT plan_id FROM plan_collaborators WHERE profile_id = auth.uid();
$$;

-- plan_collaborators (was self-referential)
DROP POLICY IF EXISTS "plan_collaborators: collaborator access" ON plan_collaborators;
CREATE POLICY "plan_collaborators: collaborator access"
  ON plan_collaborators FOR ALL
  USING (plan_id IN (SELECT get_my_plan_ids()));

-- plans
DROP POLICY IF EXISTS "plans: collaborator access" ON plans;
CREATE POLICY "plans: collaborator access"
  ON plans FOR ALL
  USING (id IN (SELECT get_my_plan_ids()));

-- activities
DROP POLICY IF EXISTS "activities: collaborator access" ON activities;
CREATE POLICY "activities: collaborator access"
  ON activities FOR ALL
  USING (plan_id IN (SELECT get_my_plan_ids()));

-- activity_edges
DROP POLICY IF EXISTS "activity_edges: collaborator access" ON activity_edges;
CREATE POLICY "activity_edges: collaborator access"
  ON activity_edges FOR ALL
  USING (plan_id IN (SELECT get_my_plan_ids()));

-- audit_log
DROP POLICY IF EXISTS "audit_log: collaborator read" ON audit_log;
DROP POLICY IF EXISTS "audit_log: collaborator insert" ON audit_log;
CREATE POLICY "audit_log: collaborator read"
  ON audit_log FOR SELECT
  USING (plan_id IN (SELECT get_my_plan_ids()));
CREATE POLICY "audit_log: collaborator insert"
  ON audit_log FOR INSERT
  WITH CHECK (plan_id IN (SELECT get_my_plan_ids()));

-- plan_invitations
DROP POLICY IF EXISTS "plan_invitations: collaborator access" ON plan_invitations;
CREATE POLICY "plan_invitations: collaborator access"
  ON plan_invitations FOR ALL
  USING (plan_id IN (SELECT get_my_plan_ids()));
