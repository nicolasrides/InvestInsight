import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Plan, Activity, ActivityEdge, AcceptanceCriterion } from '@/types/database'

export function usePlan(planId: string) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [edges, setEdges] = useState<ActivityEdge[]>([])
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!planId) return

    async function load() {
      setLoading(true)
      setError(null)

      const [planRes, activitiesRes, edgesRes, criteriaRes] = await Promise.all([
        supabase.from('plans').select('*').eq('id', planId).single(),
        supabase.from('activities').select('*').eq('plan_id', planId),
        supabase.from('activity_edges').select('*').eq('plan_id', planId),
        supabase.from('acceptance_criteria').select('*').eq('plan_id', planId).order('sort_order'),
      ])

      if (planRes.error) { setError(planRes.error.message); setLoading(false); return }
      if (activitiesRes.error) { setError(activitiesRes.error.message); setLoading(false); return }
      if (edgesRes.error) { setError(edgesRes.error.message); setLoading(false); return }

      setPlan(planRes.data)
      setActivities(activitiesRes.data ?? [])
      setEdges(edgesRes.data ?? [])
      setCriteria(criteriaRes.data ?? [])
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`plan-${planId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `plan_id=eq.${planId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setActivities(prev => [...prev, payload.new as Activity])
          } else if (payload.eventType === 'UPDATE') {
            setActivities(prev =>
              prev.map(a => (a.id === (payload.new as Activity).id ? (payload.new as Activity) : a)),
            )
          } else if (payload.eventType === 'DELETE') {
            setActivities(prev => prev.filter(a => a.id !== (payload.old as { id: string }).id))
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_edges', filter: `plan_id=eq.${planId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setEdges(prev => [...prev, payload.new as ActivityEdge])
          } else if (payload.eventType === 'DELETE') {
            setEdges(prev => prev.filter(e => e.id !== (payload.old as { id: string }).id))
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'acceptance_criteria', filter: `plan_id=eq.${planId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setCriteria(prev =>
              prev.some(c => c.id === (payload.new as AcceptanceCriterion).id)
                ? prev
                : [...prev, payload.new as AcceptanceCriterion],
            )
          } else if (payload.eventType === 'UPDATE') {
            setCriteria(prev =>
              prev.map(c => c.id === (payload.new as AcceptanceCriterion).id ? payload.new as AcceptanceCriterion : c),
            )
          } else if (payload.eventType === 'DELETE') {
            setCriteria(prev => prev.filter(c => c.id !== (payload.old as { id: string }).id))
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [planId])

  return { plan, setPlan, activities, edges, criteria, loading, error }
}
