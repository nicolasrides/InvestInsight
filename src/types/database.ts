// TypeScript types mirroring the Supabase schema.
// Keep in sync with supabase/migrations/001_initial_schema.sql.

export type PlanStatus = 'active' | 'archived'
export type LifecycleStatus = 'created' | 'active' | 'evaluated' | 'archived'
export type EntityType = 'plan' | 'activity' | 'edge' | 'collaborator'
export type AuditAction = 'create' | 'update' | 'delete'
export type InvitationStatus = 'pending' | 'accepted' | 'declined'

// Derived at read time — never stored in the DB
export type ActivityGraphState = 'active' | 'locked' | 'closed' | 'archived'

export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id: string
  display_name: string
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  organization_id: string
  name: string
  description: string | null
  currency: string
  status: PlanStatus
  created_by: string
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface PlanCollaborator {
  plan_id: string
  profile_id: string
  invited_by: string | null
  joined_at: string
}

export interface Activity {
  id: string
  plan_id: string
  name: string
  lifecycle_status: LifecycleStatus
  outcome_status: string | null
  time_planned: number | null
  investment_planned: number | null
  return_planned: number | null
  time_actual: number | null
  investment_actual: number | null
  return_actual: number | null
  position_x: number
  position_y: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface ActivityEdge {
  id: string
  plan_id: string
  from_activity_id: string
  to_activity_id: string
  condition_label: string
  created_by: string
  created_at: string
}

export interface AuditLogEntry {
  id: string
  plan_id: string
  actor_id: string
  entity_type: EntityType
  entity_id: string
  action: AuditAction
  field_name: string | null
  old_value: unknown
  new_value: unknown
  comment: string | null
  created_at: string
}

export interface AcceptanceCriterion {
  id: string
  activity_id: string
  plan_id: string
  text: string
  is_checked: boolean
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface PlanInvitation {
  id: string
  plan_id: string
  email: string
  invited_by: string
  status: InvitationStatus
  token: string
  created_at: string
  expires_at: string
}
