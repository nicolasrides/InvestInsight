import { useRef, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { AcceptanceCriterion, Activity, ActivityGraphState } from '@/types/database'
import { useGraphContext } from '@/lib/graphContext'

export type ActivityNodeData = {
  activity: Activity
  graphState: ActivityGraphState
  currency: string
  criteria: AcceptanceCriterion[]
  onRename: (id: string, name: string) => void
}

export type ActivityNodeType = Node<ActivityNodeData, 'activity'>

const lifecycleBadge: Record<Activity['lifecycle_status'], string> = {
  created:   'bg-indigo-900 text-indigo-300',
  active:    'bg-blue-900 text-blue-300',
  evaluated: 'bg-amber-900 text-amber-300',
  archived:  'bg-slate-800 text-slate-500',
}

const containerStyles: Record<ActivityGraphState, string> = {
  active:   'border-slate-400 bg-slate-800',
  locked:   'border-slate-700 bg-slate-900 opacity-60',
  closed:   'border-slate-800 bg-slate-950 opacity-40',
  archived: 'border-slate-700 bg-slate-800 opacity-70',
}

const handleStyle = {
  width: 10,
  height: 10,
  background: '#64748b',
  border: '2px solid #0f172a',
}

function fmt(value: number | null, currency: string, isTime: boolean): string {
  if (value == null) return '—'
  if (isTime) return `${value}h`
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + currency
}

function fmtShort(value: number, currency: string, isTime: boolean): string {
  if (isTime) return `${value}h`
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M ' + currency
  if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k ' + currency
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + currency
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
    >
      <path d="M3 2l4 3-4 3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      className="flex-shrink-0 mt-0.5 opacity-0 group-hover/name:opacity-100 transition-opacity duration-100"
    >
      <path d="M7 1.5l1.5 1.5L3 8.5H1.5V7L7 1.5z" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ActivityNode({ data, selected }: NodeProps<ActivityNodeType>) {
  const { activity, graphState, currency, criteria, onRename } = data
  const { expanded } = useGraphContext()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(activity.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasMetrics =
    activity.time_planned != null || activity.time_actual != null ||
    activity.investment_planned != null || activity.investment_actual != null ||
    activity.return_planned != null || activity.return_actual != null

  const checkedCount = criteria.filter(c => c.is_checked).length
  const allCriteriaMet = criteria.length > 0 && checkedCount === criteria.length

  function startEditing(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(activity.name)
    setEditing(true)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== activity.name) {
      onRename(activity.id, trimmed)
    } else {
      setDraft(activity.name)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setDraft(activity.name); setEditing(false) }
    e.stopPropagation()
  }

  // Compact summary for collapsed metrics
  const collapsedParts: string[] = []
  if (activity.investment_planned != null)
    collapsedParts.push(`I: ${fmtShort(activity.investment_planned, currency, false)}`)
  if (activity.return_planned != null)
    collapsedParts.push(`R: ${fmtShort(activity.return_planned, currency, false)}`)
  const collapsedSummary = collapsedParts.length > 0 ? collapsedParts.join(' · ') : '—'

  return (
    <div
      className={`
        group rounded-lg border min-w-56 max-w-72 px-3.5 py-3 select-none transition-opacity
        ${containerStyles[graphState]}
        ${selected ? 'ring-2 ring-slate-300 ring-offset-1 ring-offset-slate-950' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />

      <div className="space-y-2">
        {/* Name */}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="w-full rounded bg-slate-700 px-1.5 py-0.5 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            style={{ minWidth: 0 }}
          />
        ) : (
          <div
            className="group/name flex items-start gap-1 cursor-text"
            onDoubleClick={startEditing}
            title="Double-click to rename"
          >
            <p
              className={`flex-1 text-sm font-semibold leading-tight break-words ${
                graphState === 'closed' ? 'line-through text-slate-500' : 'text-white'
              }`}
            >
              {activity.name}
            </p>
            <PencilIcon />
          </div>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${lifecycleBadge[activity.lifecycle_status]}`}>
            {activity.lifecycle_status}
          </span>
          {activity.outcome_status && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
              {activity.outcome_status}
            </span>
          )}
        </div>

        {/* ── Metrics section ── */}
        {hasMetrics && (
          <div className="border-t border-slate-700 pt-2">
            {/* Section header (always visible) */}
            <div className="flex items-center gap-1.5 mb-1">
              <Chevron open={expanded} />
              <span className="text-slate-400 font-semibold uppercase tracking-wider" style={{ fontSize: '10px' }}>Metrics</span>
              {!expanded && (
                <span className="text-xs text-slate-500 ml-auto tabular-nums">{collapsedSummary}</span>
              )}
            </div>

            {/* Expanded table */}
            {expanded && (
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-slate-600 font-normal pb-1 w-14"></th>
                    <th className="text-right text-slate-500 font-medium pb-1 pr-3">Plan</th>
                    <th className="text-right text-slate-500 font-medium pb-1">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {(activity.time_planned != null || activity.time_actual != null) && (
                    <MetricRow label="Time" planned={activity.time_planned} actual={activity.time_actual} currency={currency} isTime higherIsBetter={false} />
                  )}
                  {(activity.investment_planned != null || activity.investment_actual != null) && (
                    <MetricRow label="Invest" planned={activity.investment_planned} actual={activity.investment_actual} currency={currency} higherIsBetter={false} />
                  )}
                  {(activity.return_planned != null || activity.return_actual != null) && (
                    <MetricRow label="Return" planned={activity.return_planned} actual={activity.return_actual} currency={currency} higherIsBetter />
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Acceptance Criteria section ── */}
        {criteria.length > 0 && (
          <div className="border-t border-slate-700 pt-2">
            {/* Section header (always visible) */}
            <div className="flex items-center gap-1.5">
              <Chevron open={expanded} />
              <span className="text-slate-400 font-semibold uppercase tracking-wider" style={{ fontSize: '10px' }}>Criteria</span>
              <div className="ml-auto flex items-center gap-1.5">
                {allCriteriaMet ? (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-300 font-medium">✓ All met</span>
                ) : (
                  <span className="text-xs text-slate-500 tabular-nums">{checkedCount}/{criteria.length}</span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allCriteriaMet ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${Math.round((checkedCount / criteria.length) * 100)}%` }}
              />
            </div>

            {/* Expanded list */}
            {expanded && (
              <ul className="mt-2 space-y-1.5">
                {criteria.map(c => (
                  <li key={c.id} className="flex items-start gap-2">
                    <span className={`mt-0.5 flex-shrink-0 text-xs leading-none ${c.is_checked ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {c.is_checked ? '✓' : '·'}
                    </span>
                    <span className={`text-xs leading-snug ${c.is_checked ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      {c.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  )
}

type MetricRowProps = {
  label: string
  planned: number | null
  actual: number | null
  currency: string
  isTime?: boolean
  higherIsBetter?: boolean
}

function MetricRow({ label, planned, actual, currency, isTime = false, higherIsBetter = false }: MetricRowProps) {
  let actualColor = 'text-slate-400'
  let variance: string | null = null

  if (actual != null && planned != null && planned !== 0) {
    const better = higherIsBetter ? actual >= planned : actual <= planned
    actualColor = better ? 'text-emerald-400' : 'text-red-400'
    const pct = Math.round(((actual - planned) / planned) * 100)
    if (pct !== 0) variance = `${pct > 0 ? '+' : ''}${pct}%`
  }

  return (
    <tr>
      <td className="text-slate-500 pr-2 py-0.5 text-left whitespace-nowrap">{label}</td>
      <td className="text-slate-400 pr-3 py-0.5 text-right tabular-nums">{fmt(planned, currency, isTime)}</td>
      <td className={`py-0.5 text-right tabular-nums ${actualColor}`}>
        {fmt(actual, currency, isTime)}
        {variance && <span className="ml-1 opacity-60" style={{ fontSize: '10px' }}>{variance}</span>}
      </td>
    </tr>
  )
}
