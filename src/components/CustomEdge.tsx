import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

type CustomEdgeData = {
  onDelete: (id: string) => void
}

export default function CustomEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  label, style,
  data,
}: EdgeProps) {
  const [visible, setVisible] = useState(false)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const onDelete = (data as CustomEdgeData | undefined)?.onDelete

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      {/* Wide invisible stroke for easier hover/touch targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onTouchStart={e => { e.stopPropagation(); setVisible(v => !v) }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {label && (
            <span
              className="text-slate-400 bg-slate-950 rounded px-1.5 py-0.5"
              style={{ fontSize: 11, pointerEvents: 'none' }}
            >
              {label as string}
            </span>
          )}
          {visible && onDelete && (
            <button
              className="nodrag nopan w-5 h-5 rounded-full bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 hover:text-red-300 flex items-center justify-center text-xs leading-none transition-colors"
              style={{ pointerEvents: 'all' }}
              title="Delete edge"
              onMouseEnter={() => setVisible(true)}
              onMouseLeave={() => setVisible(false)}
              onClick={e => { e.stopPropagation(); onDelete(id) }}
            >
              ×
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
