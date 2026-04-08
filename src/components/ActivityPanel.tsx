import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AcceptanceCriterion, Activity } from '@/types/database'

interface Props {
  activity: Activity
  currency: string
  onClose: () => void
  onSave: (updates: Partial<Activity>) => Promise<void>
  onDelete: () => void
}

function variance(planned: number | null, actual: number | null): string | null {
  if (planned == null || actual == null) return null
  const diff = actual - planned
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toLocaleString()}`
}

function varianceColor(planned: number | null, actual: number | null, inverseGood = false): string {
  if (planned == null || actual == null) return 'text-slate-500'
  const diff = actual - planned
  if (diff === 0) return 'text-slate-400'
  const overIsGood = inverseGood ? diff < 0 : diff > 0
  return overIsGood ? 'text-emerald-400' : 'text-red-400'
}

const LIFECYCLE_OPTIONS: Activity['lifecycle_status'][] = ['created', 'active', 'evaluated', 'archived']

export default function ActivityPanel({ activity, currency, onClose, onSave, onDelete }: Props) {
  // ── Activity fields ────────────────────────────────────────
  const [name, setName] = useState(activity.name)
  const [timePlanned, setTimePlanned] = useState(activity.time_planned?.toString() ?? '')
  const [timeActual, setTimeActual] = useState(activity.time_actual?.toString() ?? '')
  const [investPlanned, setInvestPlanned] = useState(activity.investment_planned?.toString() ?? '')
  const [investActual, setInvestActual] = useState(activity.investment_actual?.toString() ?? '')
  const [returnPlanned, setReturnPlanned] = useState(activity.return_planned?.toString() ?? '')
  const [returnActual, setReturnActual] = useState(activity.return_actual?.toString() ?? '')
  const [outcomeStatus, setOutcomeStatus] = useState(activity.outcome_status ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // ── Acceptance criteria ────────────────────────────────────
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([])
  const [newText, setNewText] = useState('')
  const [addingCriterion, setAddingCriterion] = useState(false)
  const [criteriaError, setCriteriaError] = useState<string | null>(null)
  const newInputRef = useRef<HTMLInputElement>(null)

  const criteriaRef = useRef<HTMLDivElement>(null)
  const prevAllChecked = useRef(false)
  const allChecked = criteria.length > 0 && criteria.every(c => c.is_checked)
  const progress = criteria.length > 0
    ? Math.round((criteria.filter(c => c.is_checked).length / criteria.length) * 100)
    : 0

  useEffect(() => {
    if (allChecked && !prevAllChecked.current) {
      const el = criteriaRef.current
      if (el) {
        el.classList.remove('animate-criteria-complete')
        void el.offsetWidth
        el.classList.add('animate-criteria-complete')
      }
    }
    prevAllChecked.current = allChecked
  }, [allChecked])

  useEffect(() => {
    supabase
      .from('acceptance_criteria')
      .select('*')
      .eq('activity_id', activity.id)
      .order('sort_order')
      .then(({ data }) => setCriteria(data ?? []))

    const channel = supabase
      .channel(`criteria-${activity.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'acceptance_criteria', filter: `activity_id=eq.${activity.id}` },
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
  }, [activity.id])

  async function addCriterion() {
    const text = newText.trim()
    if (!text) return
    setAddingCriterion(true)
    setCriteriaError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAddingCriterion(false); return }

    const { error } = await supabase
      .from('acceptance_criteria')
      .insert({
        activity_id: activity.id,
        plan_id: activity.plan_id,
        text,
        sort_order: criteria.length,
        created_by: user.id,
      })

    if (error) {
      setCriteriaError(error.message)
      setAddingCriterion(false)
      return
    }

    setNewText('')
    setAddingCriterion(false)
    newInputRef.current?.focus()
  }

  async function toggleCriterion(id: string, checked: boolean) {
    await supabase.from('acceptance_criteria').update({ is_checked: checked }).eq('id', id)
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, is_checked: checked } : c))
  }

  async function deleteCriterion(id: string) {
    await supabase.from('acceptance_criteria').delete().eq('id', id)
    setCriteria(prev => prev.filter(c => c.id !== id))
  }

  function toNum(val: string): number | null {
    const n = parseFloat(val)
    return isNaN(n) ? null : n
  }

  async function save(updates: Partial<Activity>) {
    setSaving(true)
    setSaved(false)
    await onSave(updates)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <aside className="
      fixed bottom-0 inset-x-0 z-40
      bg-slate-950 border-t border-slate-800
      rounded-t-2xl max-h-[85vh]
      flex flex-col
      md:relative md:inset-auto md:bottom-auto
      md:w-80 md:flex-shrink-0
      md:border-l md:border-t-0
      md:rounded-none md:max-h-full
    ">
      {/* Drag handle — mobile only */}
      <div className="flex justify-center pt-2.5 pb-1 md:hidden flex-shrink-0">
        <div className="w-8 h-1 rounded-full bg-slate-700" />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Activity</p>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{activity.name}</p>
        </div>
        <div className="flex items-center gap-2 pt-1 flex-shrink-0">
          {/* Save status dot */}
          {saving && (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse flex-shrink-0" title="Saving…" />
          )}
          {saved && !saving && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Saved" />
          )}

          {/* Delete — two-step confirmation */}
          {confirmingDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-400 font-medium whitespace-nowrap">Delete?</span>
              <button
                onClick={() => { setConfirmingDelete(false); onDelete() }}
                className="text-xs font-medium text-white bg-red-700 hover:bg-red-600 px-2 py-0.5 rounded transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="text-xs text-slate-400 hover:text-slate-300"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="text-slate-600 hover:text-red-400 transition-colors p-0.5 rounded"
              aria-label="Delete activity"
              title="Delete activity"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M6 6v4M8 6v4M3 3.5l.7 7a.5.5 0 00.5.5h5.6a.5.5 0 00.5-.5l.7-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none p-0.5"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Name */}
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => name !== activity.name && save({ name })}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        {/* Lifecycle status — segmented buttons */}
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-400">Status</label>
          <div className="grid grid-cols-2 gap-1.5">
            {LIFECYCLE_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => save({ lifecycle_status: opt })}
                className={`py-2 rounded-md text-xs font-medium capitalize transition-colors ${
                  activity.lifecycle_status === opt
                    ? 'bg-slate-500 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Outcome status — only when evaluated */}
        {activity.lifecycle_status === 'evaluated' && (
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              Outcome{' '}
              <span className="text-slate-600">— unlocks matching downstream edges</span>
            </label>
            <input
              type="text"
              value={outcomeStatus}
              onChange={e => setOutcomeStatus(e.target.value)}
              onBlur={() => {
                if (outcomeStatus !== (activity.outcome_status ?? '')) {
                  save({ outcome_status: outcomeStatus.trim() || null })
                }
              }}
              placeholder="e.g. pass, fail, low, high"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        )}

        <hr className="border-slate-800" />

        {/* ── Acceptance Criteria ── */}
        <div ref={criteriaRef} className="space-y-3 rounded-lg p-1 -m-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Acceptance Criteria
              </p>
              {allChecked && criteria.length > 0 && (
                <span className="animate-badge-pop inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-300 font-medium">
                  ✓ All met
                </span>
              )}
            </div>
            {criteria.length > 0 && (
              <span className="text-xs tabular-nums text-slate-500">
                {criteria.filter(c => c.is_checked).length}/{criteria.length}
              </span>
            )}
          </div>

          {criteria.length > 0 && (
            <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allChecked ? 'bg-emerald-500' : 'bg-slate-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {criteria.length === 0 && (
            <p className="text-xs text-slate-600">No criteria yet.</p>
          )}

          <ul className="space-y-1.5">
            {criteria.map(c => (
              <li key={c.id} className="flex items-start gap-2 group">
                <input
                  type="checkbox"
                  checked={c.is_checked}
                  onChange={e => toggleCriterion(c.id, e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded accent-emerald-500 cursor-pointer"
                />
                <span className={`flex-1 text-xs leading-snug ${c.is_checked ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                  {c.text}
                </span>
                {/* Always visible on mobile, hover-only on desktop */}
                <button
                  onClick={() => deleteCriterion(c.id)}
                  className="text-slate-600 hover:text-red-400 text-sm leading-none flex-shrink-0 transition-colors md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Delete criterion"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={e => { e.preventDefault(); addCriterion() }} className="flex gap-1.5">
            <input
              ref={newInputRef}
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Add criterion…"
              className="flex-1 rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <button
              type="submit"
              disabled={!newText.trim() || addingCriterion}
              className="rounded bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </form>
          {criteriaError && <p className="text-xs text-red-400">{criteriaError}</p>}
        </div>

        <hr className="border-slate-800" />

        {/* Planned / Actual grid */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Metrics</p>

          {/* Time */}
          <div className="space-y-1">
            <label className="block text-xs text-slate-500">Time (days)</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500">Planned</span>
                <input
                  type="number" min="0" value={timePlanned}
                  onChange={e => setTimePlanned(e.target.value)}
                  onBlur={() => toNum(timePlanned) !== activity.time_planned && save({ time_planned: toNum(timePlanned) })}
                  placeholder="—"
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-500 tabular-nums"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500">Actual</span>
                <input
                  type="number" min="0" value={timeActual}
                  onChange={e => setTimeActual(e.target.value)}
                  onBlur={() => toNum(timeActual) !== activity.time_actual && save({ time_actual: toNum(timeActual) })}
                  placeholder="—"
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-500 tabular-nums"
                />
              </div>
            </div>
            {variance(activity.time_planned, activity.time_actual) && (
              <p className={`text-xs tabular-nums ${varianceColor(activity.time_planned, activity.time_actual)}`}>
                {variance(activity.time_planned, activity.time_actual)} days vs plan
              </p>
            )}
          </div>

          {/* Investment */}
          <div className="space-y-1">
            <label className="block text-xs text-slate-500">Investment ({currency})</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500">Planned</span>
                <input
                  type="number" min="0" value={investPlanned}
                  onChange={e => setInvestPlanned(e.target.value)}
                  onBlur={() => toNum(investPlanned) !== activity.investment_planned && save({ investment_planned: toNum(investPlanned) })}
                  placeholder="—"
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-500 tabular-nums"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500">Actual</span>
                <input
                  type="number" min="0" value={investActual}
                  onChange={e => setInvestActual(e.target.value)}
                  onBlur={() => toNum(investActual) !== activity.investment_actual && save({ investment_actual: toNum(investActual) })}
                  placeholder="—"
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-500 tabular-nums"
                />
              </div>
            </div>
            {variance(activity.investment_planned, activity.investment_actual) && (
              <p className={`text-xs tabular-nums ${varianceColor(activity.investment_planned, activity.investment_actual)}`}>
                {variance(activity.investment_planned, activity.investment_actual)} {currency} vs plan
              </p>
            )}
          </div>

          {/* Return */}
          <div className="space-y-1">
            <label className="block text-xs text-slate-500">Return ({currency})</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500">Planned</span>
                <input
                  type="number" value={returnPlanned}
                  onChange={e => setReturnPlanned(e.target.value)}
                  onBlur={() => toNum(returnPlanned) !== activity.return_planned && save({ return_planned: toNum(returnPlanned) })}
                  placeholder="—"
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-500 tabular-nums"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500">Actual</span>
                <input
                  type="number" value={returnActual}
                  onChange={e => setReturnActual(e.target.value)}
                  onBlur={() => toNum(returnActual) !== activity.return_actual && save({ return_actual: toNum(returnActual) })}
                  placeholder="—"
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-500 tabular-nums"
                />
              </div>
            </div>
            {variance(activity.return_planned, activity.return_actual) && (
              <p className={`text-xs tabular-nums ${varianceColor(activity.return_planned, activity.return_actual, true)}`}>
                {variance(activity.return_planned, activity.return_actual)} {currency} vs plan
              </p>
            )}
          </div>
        </div>

      </div>
    </aside>
  )
}
