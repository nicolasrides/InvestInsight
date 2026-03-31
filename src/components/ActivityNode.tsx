import { useRef, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { Activity, ActivityGraphState } from '@/types/database'

export type ActivityNodeData = {
  activity: Activity
  graphState: ActivityGraphState
  onRename: (id: string, name: string) => void
}

export type ActivityNodeType = Node<ActivityNodeData, 'activity'>

const lifecycleBadge: Record<Activity['lifecycle_status'], string> = {
  created:   'bg-slate-700 text-slate-300',
  active:    'bg-blue-900 text-blue-300',
  evaluated: 'bg-amber-900 text-amber-300',
  archived:  'bg-slate-700 text-slate-400',
}

const containerStyles: Record<ActivityGraphState, string> = {
  active:   'border-slate-400 bg-slate-800',
  locked:   'border-slate-700 bg-slate-900 opacity-60',
  closed:   'border-slate-800 bg-slate-950 opacity-35',
  archived: 'border-slate-600 bg-slate-800 opacity-75',
}

const handleStyle = {
  width: 10,
  height: 10,
  background: '#64748b',
  border: '2px solid #0f172a',
}

export default function ActivityNode({ data, selected }: NodeProps<ActivityNodeType>) {
  const { activity, graphState, onRename } = data
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(activity.name)
  const inputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div
      className={`
        rounded-lg border min-w-44 max-w-56 px-4 py-3 select-none transition-opacity
        ${containerStyles[graphState]}
        ${selected ? 'ring-2 ring-slate-300 ring-offset-1 ring-offset-slate-950' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />

      <div className="space-y-2">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="w-full rounded bg-slate-700 px-1.5 py-0.5 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            style={{ minWidth: 0 }}
          />
        ) : (
          <p
            onDoubleClick={startEditing}
            className={`text-sm font-medium leading-tight break-words cursor-text ${
              graphState === 'closed' ? 'line-through text-slate-500' : 'text-white'
            }`}
          >
            {activity.name}
          </p>
        )}

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

        {activity.investment_planned != null && (
          <p className="text-xs text-slate-400 tabular-nums">
            {activity.investment_planned.toLocaleString()} planned
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  )
}
