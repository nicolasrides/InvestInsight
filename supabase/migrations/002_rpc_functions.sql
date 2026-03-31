-- RPC functions for atomic multi-table operations.
-- SECURITY DEFINER means the function runs with the privileges of the owner,
-- bypassing RLS for the operations inside it.

-- ============================================================
-- setup_user
-- Called once after a user confirms their email.
-- Creates an organization and a profile in a single transaction.
-- ============================================================
CREATE OR REPLACE FUNCTION setup_user(
  p_org_name    text,
  p_display_name text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Guard: skip if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
    RETURN;
  END IF;

  INSERT INTO organizations (name)
  VALUES (p_org_name)
  RETURNING id INTO v_org_id;

  INSERT INTO profiles (id, organization_id, display_name)
  VALUES (auth.uid(), v_org_id, p_display_name);
END;
$$;

-- ============================================================
-- create_plan
-- Creates a plan and adds the calling user as a collaborator
-- atomically so a stranded plan (no collaborators) cannot occur.
-- ============================================================
CREATE OR REPLACE FUNCTION create_plan(
  p_name        text,
  p_description text DEFAULT NULL,
  p_currency    text DEFAULT 'EUR'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan_id uuid;
  v_org_id  uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM profiles WHERE id = auth.uid();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No profile found — run setup_user first';
  END IF;

  INSERT INTO plans (organization_id, name, description, currency, created_by)
  VALUES (v_org_id, p_name, p_description, p_currency, auth.uid())
  RETURNING id INTO v_plan_id;

  INSERT INTO plan_collaborators (plan_id, profile_id, invited_by)
  VALUES (v_plan_id, auth.uid(), NULL);

  RETURN v_plan_id;
END;
$$;
