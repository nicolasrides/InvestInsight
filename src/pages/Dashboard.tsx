import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Plan } from '@/types/database'

type ActivityStats = {
  total: number
  active: number
  evaluated: number
  criteriaTotal: number
  criteriaChecked: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState<Record<string, ActivityStats>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCurrency, setNewCurrency] = useState('EUR')

  useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const planList = data ?? []
        setPlans(planList)
        setLoading(false)

        if (planList.length === 0) return

        const ids = planList.map(p => p.id)

        const [activitiesRes, criteriaRes] = await Promise.all([
          supabase.from('activities').select('plan_id, lifecycle_status').in('plan_id', ids),
          supabase.from('acceptance_criteria').select('plan_id, is_checked').in('plan_id', ids),
        ])

        const map: Record<string, ActivityStats> = {}
        for (const p of planList) {
          map[p.id] = { total: 0, active: 0, evaluated: 0, criteriaTotal: 0, criteriaChecked: 0 }
        }
        for (const a of activitiesRes.data ?? []) {
          const s = map[a.plan_id]
          if (!s) continue
          s.total++
          if (a.lifecycle_status === 'active') s.active++
          if (a.lifecycle_status === 'evaluated') s.evaluated++
        }
        for (const c of criteriaRes.data ?? []) {
          const s = map[c.plan_id]
          if (!s) continue
          s.criteriaTotal++
          if (c.is_checked) s.criteriaChecked++
        }
        setStats(map)
      })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/sign-in')
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)

    const { data, error } = await supabase.rpc('create_plan', {
      p_name: newName.trim(),
      p_currency: newCurrency,
    })

    setCreating(false)
    if (error) { console.error(error); return }
    navigate(`/plans/${data as string}`)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-base font-semibold">InvestInsight</h1>
        <button onClick={handleSignOut} className="text-sm text-slate-400 hover:text-white">
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Plans</h2>
          <button
            onClick={() => setShowForm(v => !v)}
            className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-sm text-white"
          >
            + New plan
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleCreatePlan}
            className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3"
          >
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Plan name</label>
              <input
                type="text"
                required
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Market Validation 2026"
                className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Currency</label>
              <select
                value={newCurrency}
                onChange={e => setNewCurrency(e.target.value)}
                className="rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create plan'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewName('') }}
                className="rounded-md border border-slate-700 px-4 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Plan list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 py-12 text-center space-y-2">
            <p className="text-sm text-slate-400 font-medium">No plans yet</p>
            <p className="text-xs text-slate-600">Create your first investment plan to get started.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {plans.map(plan => {
              const s = stats[plan.id]
              const criteriaProgress = s && s.criteriaTotal > 0
                ? Math.round((s.criteriaChecked / s.criteriaTotal) * 100)
                : null

              return (
                <li key={plan.id}>
                  <button
                    onClick={() => navigate(`/plans/${plan.id}`)}
                    className="w-full text-left rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-3.5 flex items-start justify-between gap-4 group transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{plan.name}</p>
                        {plan.status === 'archived' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 flex-shrink-0">archived</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {plan.currency} · {new Date(plan.created_at).toLocaleDateString()}
                        {s && s.total > 0 && (
                          <> · <span className="text-slate-400">{s.total} {s.total === 1 ? 'activity' : 'activities'}</span>
                          {s.active > 0 && <span className="text-blue-400"> · {s.active} active</span>}
                          {s.evaluated > 0 && <span className="text-amber-400"> · {s.evaluated} eval'd</span>}
                          </>
                        )}
                      </p>

                      {/* Criteria progress bar */}
                      {criteriaProgress !== null && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden max-w-32">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${criteriaProgress === 100 ? 'bg-emerald-500' : 'bg-slate-600'}`}
                              style={{ width: `${criteriaProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {s!.criteriaChecked}/{s!.criteriaTotal} criteria
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-400 text-sm mt-0.5 flex-shrink-0 transition-colors">→</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
