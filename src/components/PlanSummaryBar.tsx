import type { AcceptanceCriterion, Activity } from '@/types/database'

interface Props {
  activities: Activity[]
  criteria: AcceptanceCriterion[]
  currency: string
}

function fmtShort(value: number, currency: string): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M ' + currency
  if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k ' + currency
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + currency
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2 border-r border-slate-800 flex-shrink-0">
      <span className="text-slate-600 font-semibold uppercase tracking-wider" style={{ fontSize: '9px' }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  )
}

export default function PlanSummaryBar({ activities, criteria, currency }: Props) {
  if (activities.length === 0) return null

  const byStatus = {
    created:   activities.filter(a => a.lifecycle_status === 'created').length,
    active:    activities.filter(a => a.lifecycle_status === 'active').length,
    evaluated: activities.filter(a => a.lifecycle_status === 'evaluated').length,
    archived:  activities.filter(a => a.lifecycle_status === 'archived').length,
  }

  const timePlanned    = activities.reduce((s, a) => s + (a.time_planned        ?? 0), 0)
  const timeActual     = activities.reduce((s, a) => s + (a.time_actual         ?? 0), 0)
  const hasTime        = activities.some(a => a.time_planned != null)
  const hasTimeActual  = activities.some(a => a.time_actual != null)

  const investPlanned  = activities.reduce((s, a) => s + (a.investment_planned  ?? 0), 0)
  const investActual   = activities.reduce((s, a) => s + (a.investment_actual   ?? 0), 0)
  const returnPlanned  = activities.reduce((s, a) => s + (a.return_planned      ?? 0), 0)
  const returnActual   = activities.reduce((s, a) => s + (a.return_actual       ?? 0), 0)
  const hasInvest      = activities.some(a => a.investment_planned != null)
  const hasReturn      = activities.some(a => a.return_planned != null)
  const hasInvestActual = activities.some(a => a.investment_actual != null)
  const hasReturnActual = activities.some(a => a.return_actual != null)

  const netPlanned = returnPlanned - investPlanned
  const netActual  = returnActual  - investActual
  const showNet    = hasInvest && hasReturn

  const checkedCriteria = criteria.filter(c => c.is_checked).length
  const criteriaProgress = criteria.length > 0
    ? Math.round((checkedCriteria / criteria.length) * 100)
    : 0

  return (
    <div className="flex items-stretch border-b border-slate-800 bg-slate-950 overflow-x-auto flex-shrink-0 scrollbar-none">
      {/* Activity breakdown */}
      <Stat label="Activities">
        {byStatus.created   > 0 && <span className="text-xs text-indigo-400 tabular-nums">{byStatus.created} created</span>}
        {byStatus.active    > 0 && <span className="text-xs text-blue-400 tabular-nums">{byStatus.active} active</span>}
        {byStatus.evaluated > 0 && <span className="text-xs text-amber-400 tabular-nums">{byStatus.evaluated} eval'd</span>}
        {byStatus.archived  > 0 && <span className="text-xs text-slate-500 tabular-nums">{byStatus.archived} arch'd</span>}
        {activities.length === 1 && Object.values(byStatus).every(v => v <= 1) && (
          <span className="text-xs text-slate-400 tabular-nums">{activities.length} total</span>
        )}
      </Stat>

      {/* Duration */}
      {hasTime && (
        <Stat label="Duration">
          <span className="text-slate-300 text-xs tabular-nums">{timePlanned}d</span>
          {hasTimeActual && (
            <>
              <span className="text-slate-600 text-xs">→</span>
              <span className={`text-xs tabular-nums ${timeActual <= timePlanned ? 'text-emerald-400' : 'text-red-400'}`}>
                {timeActual}d
              </span>
            </>
          )}
        </Stat>
      )}

      {/* Investment */}
      {hasInvest && (
        <Stat label="Investment">
          <span className="text-amber-400 text-xs tabular-nums">{fmtShort(investPlanned, currency)}</span>
          {hasInvestActual && (
            <>
              <span className="text-slate-600 text-xs">→</span>
              <span className={`text-xs tabular-nums ${investActual <= investPlanned ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtShort(investActual, currency)}
              </span>
            </>
          )}
        </Stat>
      )}

      {/* Return */}
      {hasReturn && (
        <Stat label="Return">
          <span className="text-emerald-400 text-xs tabular-nums">{fmtShort(returnPlanned, currency)}</span>
          {hasReturnActual && (
            <>
              <span className="text-slate-600 text-xs">→</span>
              <span className={`text-xs tabular-nums ${returnActual >= returnPlanned ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtShort(returnActual, currency)}
              </span>
            </>
          )}
        </Stat>
      )}

      {/* Net ROI */}
      {showNet && (
        <Stat label="Net ROI">
          <span className={`text-xs tabular-nums font-medium ${netPlanned >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netPlanned >= 0 ? '+' : ''}{fmtShort(netPlanned, currency)}
          </span>
          {hasInvestActual && hasReturnActual && (
            <>
              <span className="text-slate-600 text-xs">→</span>
              <span className={`text-xs tabular-nums font-medium ${netActual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netActual >= 0 ? '+' : ''}{fmtShort(netActual, currency)}
              </span>
            </>
          )}
        </Stat>
      )}

      {/* Criteria progress */}
      {criteria.length > 0 && (
        <Stat label="Criteria">
          <span className="text-xs tabular-nums text-slate-300">
            <span className="font-medium">{checkedCriteria}</span>
            <span className="text-slate-600">/{criteria.length}</span>
          </span>
          <div className="w-14 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${criteriaProgress === 100 ? 'bg-emerald-500' : 'bg-slate-500'}`}
              style={{ width: `${criteriaProgress}%` }}
            />
          </div>
        </Stat>
      )}
    </div>
  )
}
