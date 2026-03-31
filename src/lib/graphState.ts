import type { Activity, ActivityEdge, ActivityGraphState } from '@/types/database'

/**
 * Computes the visual graph state for every activity.
 *
 * States:
 *  active  — root node, OR any incoming edge has upstream.outcome_status === edge.condition_label
 *  locked  — waiting on at least one upstream activity to be evaluated
 *  closed  — all incoming paths are definitively closed (upstream decided, no match)
 *  archived — activity.lifecycle_status === 'archived'
 *
 * Uses iterative refinement so that closed status propagates through multi-hop chains
 * (A closed → B closed → C closed), terminating in at most N passes.
 */
export function computeGraphStates(
  activities: Activity[],
  edges: ActivityEdge[],
): Map<string, ActivityGraphState> {
  const activityMap = new Map<string, Activity>()
  for (const a of activities) activityMap.set(a.id, a)

  // incoming edges per activity
  const incomingEdges = new Map<string, ActivityEdge[]>()
  for (const a of activities) incomingEdges.set(a.id, [])
  for (const e of edges) incomingEdges.get(e.to_activity_id)?.push(e)

  const states = new Map<string, ActivityGraphState>()

  // Initial pass: roots and archived
  for (const a of activities) {
    if (a.lifecycle_status === 'archived') {
      states.set(a.id, 'archived')
    } else if ((incomingEdges.get(a.id)?.length ?? 0) === 0) {
      states.set(a.id, 'active')
    } else {
      states.set(a.id, 'locked')
    }
  }

  // Iterative refinement — propagates active and closed through the graph
  let changed = true
  while (changed) {
    changed = false
    for (const a of activities) {
      if (a.lifecycle_status === 'archived') continue
      const incoming = incomingEdges.get(a.id) ?? []
      if (incoming.length === 0) continue // root stays active

      const current = states.get(a.id)!

      // Check if any upstream unlocks this node
      const isActive = incoming.some(edge => {
        const upstream = activityMap.get(edge.from_activity_id)
        const upstreamState = states.get(edge.from_activity_id)
        return (
          (upstreamState === 'active' || upstreamState === 'archived') &&
          upstream?.outcome_status === edge.condition_label
        )
      })

      if (isActive) {
        if (current !== 'active') { states.set(a.id, 'active'); changed = true }
        continue
      }

      // Check if all upstream paths are definitively closed
      const allClosed = incoming.every(edge => {
        const upstream = activityMap.get(edge.from_activity_id)
        const upstreamState = states.get(edge.from_activity_id)
        return (
          upstreamState === 'closed' ||
          (upstream?.outcome_status != null && upstream.outcome_status !== edge.condition_label)
        )
      })

      const next: ActivityGraphState = allClosed ? 'closed' : 'locked'
      if (current !== next) { states.set(a.id, next); changed = true }
    }
  }

  return states
}
