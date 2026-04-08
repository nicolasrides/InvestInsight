import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
} from '@xyflow/react'
import type { Connection, Edge, NodeMouseHandler, OnConnect, ReactFlowProps } from '@xyflow/react'

type NodeDragHandler = NonNullable<ReactFlowProps['onNodeDragStop']>
import '@xyflow/react/dist/style.css'

import { supabase } from '@/lib/supabase'
import { usePlan } from '@/hooks/usePlan'
import { computeGraphStates } from '@/lib/graphState'
import ActivityNode from '@/components/ActivityNode'
import type { ActivityNodeType } from '@/components/ActivityNode'
import ActivityPanel from '@/components/ActivityPanel'
import EdgeLabelModal from '@/components/EdgeLabelModal'
import type { Activity } from '@/types/database'

const nodeTypes = { activity: ActivityNode }

// ─── Inner component (needs ReactFlowProvider above it) ───────────────────────

function PlanGraphInner({ planId }: { planId: string }) {
  const navigate = useNavigate()
  const { screenToFlowPosition, fitView } = useReactFlow()

  const { plan, activities, edges: dbEdges, criteria, loading, error } = usePlan(planId)
  const [nodesExpanded, setNodesExpanded] = useState(false)

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<ActivityNodeType>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)
  // For handle double-click: activity already created, waiting for edge label
  const [pendingHandleEdge, setPendingHandleEdge] = useState<{ fromId: string; toId: string } | null>(null)

  const graphStates = useMemo(
    () => computeGraphStates(activities, dbEdges),
    [activities, dbEdges],
  )

  const criteriaByActivity = useMemo(() => {
    const map = new Map<string, typeof criteria>()
    for (const c of criteria) {
      const list = map.get(c.activity_id) ?? []
      list.push(c)
      map.set(c.activity_id, list)
    }
    return map
  }, [criteria])

  // Sync DB activities → RF nodes.
  // For existing nodes: only update data (name, status, etc.) — never touch position.
  // Position is managed by React Flow during drag and saved explicitly on drag-stop.
  // For new nodes (added by this user or a collaborator): use the DB position.
  useEffect(() => {
    if (!plan) return
    setRfNodes(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n]))
      return activities.map(a => {
        const existing = prevMap.get(a.id)
        const graphState = graphStates.get(a.id) ?? 'active'

        const nodeData = {
          activity: a,
          graphState,
          currency: plan.currency,
          criteria: criteriaByActivity.get(a.id) ?? [],
          expanded: nodesExpanded,
          onRename: renameActivity,
        }

        if (existing) {
          return { ...existing, data: nodeData }
        }

        return {
          id: a.id,
          type: 'activity' as const,
          position: { x: a.position_x, y: a.position_y },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: nodeData,
        }
      })
    })
  }, [activities, graphStates, criteriaByActivity])

  // Patch expanded flag without rebuilding the full node array —
  // a full rebuild causes React Flow to fire onNodeDoubleClick on new nodes.
  useEffect(() => {
    setRfNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, expanded: nodesExpanded },
    })))
  }, [nodesExpanded])

  // Sync DB edges → RF edges
  useEffect(() => {
    setRfEdges(
      dbEdges.map(e => ({
        id: e.id,
        source: e.from_activity_id,
        target: e.to_activity_id,
        label: e.condition_label,
        labelStyle: { fill: '#94a3b8', fontSize: 11 },
        labelBgStyle: { fill: '#0f172a' },
        style: { stroke: '#475569' },
        data: { edge: e },
      })),
    )
  }, [dbEdges])

  // Close panel if selected activity was deleted
  useEffect(() => {
    if (selectedActivityId && !activities.find(a => a.id === selectedActivityId)) {
      setSelectedActivityId(null)
    }
  }, [activities, selectedActivityId])

  // ── Interactions ────────────────────────────────────────────────────────────

  async function addActivity() {
    // Offset each new node vertically so they don't stack on top of each other
    const position = screenToFlowPosition({
      x: window.innerWidth / 2 - 100,
      y: window.innerHeight / 2 - 40 + activities.length * 80,
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('activities')
      .insert({
        plan_id: planId,
        name: 'New Activity',
        position_x: Math.round(position.x),
        position_y: Math.round(position.y),
        created_by: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      setSelectedActivityId(data.id)
    }
  }

  const onConnect: OnConnect = useCallback(
    (connection) => { setPendingConnection(connection) },
    [],
  )

  async function confirmHandleEdge(label: string) {
    if (!pendingHandleEdge) return
    const { fromId, toId } = pendingHandleEdge
    setPendingHandleEdge(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('activity_edges').insert({
      plan_id: planId,
      from_activity_id: fromId,
      to_activity_id: toId,
      condition_label: label,
      created_by: user.id,
    })
  }

  async function confirmEdge(label: string) {
    if (!pendingConnection) return
    const { source, target } = pendingConnection
    if (!source || !target) { setPendingConnection(null); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setPendingConnection(null); return }

    const { data, error } = await supabase
      .from('activity_edges')
      .insert({
        plan_id: planId,
        from_activity_id: source,
        to_activity_id: target,
        condition_label: label,
        created_by: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      // Optimistically add to RF edges; realtime will confirm
      setRfEdges(prev => addEdge({
        id: data.id,
        source,
        target,
        label,
        labelStyle: { fill: '#94a3b8', fontSize: 11 },
        labelBgStyle: { fill: '#0f172a' },
        style: { stroke: '#475569' },
      }, prev))
    }

    setPendingConnection(null)
  }

  const onNodeDragStop: NodeDragHandler = useCallback((_e, node) => {
    supabase
      .from('activities')
      .update({ position_x: Math.round(node.position.x), position_y: Math.round(node.position.y) })
      .eq('id', node.id)
  }, [])

  async function saveActivity(id: string, updates: Partial<Activity>) {
    await supabase.from('activities').update(updates).eq('id', id)
  }

  async function deleteActivity(id: string) {
    setSelectedActivityId(null)
    setRfNodes(prev => prev.filter(n => n.id !== id))
    await supabase.from('activities').delete().eq('id', id)
  }

  function renameActivity(id: string, name: string) {
    supabase.from('activities').update({ name }).eq('id', id)
  }

  const creatingFromHandle = useRef(false)

  const onNodeDoubleClick: NodeMouseHandler = useCallback((e, node) => {
    if (creatingFromHandle.current) return

    // Ignore double-clicks on the name text / inline input (handled by inline edit)
    const target = e.target as HTMLElement
    if (target.tagName === 'P' || target.tagName === 'INPUT') return

    const nodeEl = (e.target as HTMLElement).closest('.react-flow__node') as HTMLElement | null
    if (!nodeEl) return
    const rect = nodeEl.getBoundingClientRect()
    const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right'

    creatingFromHandle.current = true

    const source = activities.find(a => a.id === node.id)
    if (!source) { creatingFromHandle.current = false; return }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { creatingFromHandle.current = false; return }

      supabase
        .from('activities')
        .insert({
          plan_id: planId,
          name: 'New Activity',
          position_x: Math.round(source.position_x + (side === 'right' ? 280 : -280)),
          position_y: Math.round(source.position_y),
          created_by: user.id,
        })
        .select()
        .single()
        .then(({ data: newActivity, error }) => {
          creatingFromHandle.current = false
          if (error || !newActivity) return
          setSelectedActivityId(newActivity.id)
          const fromId = side === 'right' ? node.id : newActivity.id
          const toId   = side === 'right' ? newActivity.id : node.id
          setPendingHandleEdge({ fromId, toId })
        })
    })
  }, [activities, planId])

  const onNodesDelete = useCallback((deleted: ActivityNodeType[]) => {
    setSelectedActivityId(null)
    for (const node of deleted) {
      supabase.from('activities').delete().eq('id', node.id)
    }
  }, [])

  async function layoutHorizontal() {
    const NODE_WIDTH = 256
    const GAP = 52
    const STEP = NODE_WIDTH + GAP

    const sorted = [...rfNodes].sort((a, b) => a.position.x - b.position.x)
    const updated = sorted.map((node, i) => ({
      ...node,
      position: { x: i * STEP, y: 0 },
    }))

    setRfNodes(updated)

    for (const node of updated) {
      supabase
        .from('activities')
        .update({ position_x: Math.round(node.position.x), position_y: 0 })
        .eq('id', node.id)
    }

    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 50)
  }

  async function deleteEdge(edgeId: string) {
    await supabase.from('activity_edges').delete().eq('id', edgeId)
  }

  const selectedActivity = activities.find(a => a.id === selectedActivityId) ?? null

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="w-5 h-5 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-sm">{error ?? 'Plan not found.'}</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white text-sm"
        >
          ← Plans
        </button>
        <span className="text-slate-700">|</span>
        <h1 className="text-sm font-medium text-white">{plan.name}</h1>
        {plan.status === 'archived' && (
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">Archived</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={layoutHorizontal}
            className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-sm text-slate-300 flex items-center gap-1.5"
            title="Arrange all activities in a horizontal row"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
              <rect x="1" y="4" width="3" height="6" rx="0.75" fill="currentColor" opacity="0.7" />
              <rect x="5.5" y="4" width="3" height="6" rx="0.75" fill="currentColor" opacity="0.7" />
              <rect x="10" y="4" width="3" height="6" rx="0.75" fill="currentColor" opacity="0.7" />
            </svg>
            Layout
          </button>
          <button
            onClick={() => setNodesExpanded(v => !v)}
            className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-sm text-slate-300"
            title={nodesExpanded ? 'Collapse node details' : 'Expand node details'}
          >
            {nodesExpanded ? '⊟ Collapse' : '⊞ Expand'}
          </button>
          <button
            onClick={addActivity}
            className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-sm text-white"
          >
            + Add activity
          </button>
        </div>
      </header>

      {/* Canvas + panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_e, node) => setSelectedActivityId(node.id)}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeDragStop={onNodeDragStop}
            onNodesDelete={onNodesDelete}
            onEdgeClick={(_e, edge) => deleteEdge(edge.id)}
            onPaneClick={() => setSelectedActivityId(null)}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: false }}
            colorMode="dark"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#1e293b"
            />
            <Controls position="bottom-left" />
          </ReactFlow>

          {/* Edge label modal — drag-to-connect */}
          {pendingConnection && (
            <EdgeLabelModal
              onConfirm={confirmEdge}
              onCancel={() => setPendingConnection(null)}
            />
          )}

          {/* Edge label modal — handle double-click */}
          {pendingHandleEdge && (
            <EdgeLabelModal
              onConfirm={confirmHandleEdge}
              onCancel={() => setPendingHandleEdge(null)}
            />
          )}
        </div>

        {/* Activity panel */}
        {selectedActivity && (
          <ActivityPanel
            key={selectedActivity.id}
            activity={selectedActivity}
            currency={plan.currency}
            onClose={() => setSelectedActivityId(null)}
            onSave={updates => saveActivity(selectedActivity.id, updates)}
            onDelete={() => deleteActivity(selectedActivity.id)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Public export (wraps with provider) ─────────────────────────────────────

export default function PlanGraph() {
  const { id } = useParams<{ id: string }>()

  if (!id) return null

  return (
    <ReactFlowProvider>
      <PlanGraphInner planId={id} />
    </ReactFlowProvider>
  )
}
