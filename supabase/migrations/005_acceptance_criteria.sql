-- Acceptance criteria: checklist items attached to an activity.
-- When all are checked, the activity is considered ready to progress.

CREATE TABLE acceptance_criteria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  text        text NOT NULL,
  is_checked  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX acceptance_criteria_activity_id_idx ON acceptance_criteria(activity_id);
CREATE INDEX acceptance_criteria_plan_id_idx     ON acceptance_criteria(plan_id);

CREATE TRIGGER acceptance_criteria_updated_at
  BEFORE UPDATE ON acceptance_criteria
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE acceptance_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceptance_criteria: collaborator access"
  ON acceptance_criteria FOR ALL
  USING (plan_id IN (SELECT get_my_plan_ids()));
