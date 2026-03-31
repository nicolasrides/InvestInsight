-- Fix: self-referential RLS policy on profiles causes infinite recursion.
-- A policy that queries profiles to check org_id re-triggers itself.
-- Solution: use a SECURITY DEFINER function to break the recursion.

-- Drop the recursive policy
DROP POLICY IF EXISTS "profiles: same org read" ON profiles;

-- Security definer function reads profiles without triggering RLS
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- Own row: user can always read their own profile (no join needed)
CREATE POLICY "profiles: own row read"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Same org: use the security definer function to avoid recursion
CREATE POLICY "profiles: same org read"
  ON profiles FOR SELECT
  USING (organization_id = get_my_organization_id());
