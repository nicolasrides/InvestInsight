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
import CustomEdge from '@/components/CustomEdge'
import PlanSummaryBar from '@/components/PlanSummaryBar'
import HelpModal from '@/components/HelpModal'
import UndoToast from '@/components/UndoToast'
import type { Activity } from '@/types/database'

const nodeTypes = { activity: ActivityNode }
const edgeTypes = { custom: CustomEdge }

// ─── Inner component (needs ReactFlowProvider above it) ───────────────────────

function PlanGraphInner({ planId }: { planId: string }) {
  const navigate = useNavigate()
  const { screenToFlowPosition, fitView } = useReactFlow()

  const { plan, setPlan, activities, edges: dbEdges, criteria, loading, error } = usePlan(planId)

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<ActivityNodeType>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)
  const [pendingHandleEdge, setPendingHandleEdge] = useState<{ fromId: string; toId: string } | null>(null)

  // ── Undo delete ──────────────────────────────────────────────────────────────
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState('')
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Plan management ──────────────────────────────────────────────────────────
  const [editingPlanName, setEditingPlanName] = useState(false)
  const [planNameDraft, setPlanNameDraft] = useState('')
  const planNameInputRef = useRef<HTMLInputElement>(null)
  const [showPlanMenu, setShowPlanMenu] = useState(false)
  const [confirmingPlanDelete, setConfirmingPlanDelete] = useState(false)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [showHelp, setShowHelp] = useState(false)

  // Activities filtered to exclude pending deletes (node still in DB, hidden in UI)
  const visibleActivities = useMemo(() =>
    pendingDeleteId ? activities.filter(a => a.id !== pendingDeleteId) : activities,
    [activities, pendingDeleteId],
  )

  const graphStates = useMemo(
    () => computeGraphStates(visibleActivities, dbEdges),
    [visibleActivities, dbEdges],
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

  // ── Stable callbacks ─────────────────────────────────────────────────────────

  const renameActivity = useCallback((id: string, name: string) => {
    supabase.from('activities').update({ name }).eq('id', id)
  }, [])

  const toggleNodeExpand = useCallback((id: string) => {
    setRfNodes(prev => prev.map(n =>
      n.id === id ? { ...n, data: { ...n.data, expanded: !n.data.expanded } } : n,
    ))
  }, [])

  const deleteEdge = useCallback(async (edgeId: string) => {
    setRfEdges(prev => prev.filter(e => e.id !== edgeId))
    await supabase.from('activity_edges').delete().eq('id', edgeId)
  }, [])

  // ── Sync DB activities → RF nodes ────────────────────────────────────────────
  useEffect(() => {
    if (!plan) return
    setRfNodes(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n]))
      return visibleActivities.map(a => {
        const existing = prevMap.get(a.id)
        const graphState = graphStates.get(a.id) ?? 'active'

        const nodeData = {
          activity: a,
          graphState,
          currency: plan.currency,
          criteria: criteriaByActivity.get(a.id) ?? [],
          expanded: existing ? existing.data.expanded : false,
          onRename: renameActivity,
          onToggleExpand: toggleNodeExpand,
        }

        if (existing) return { ...existing, data: nodeData }

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
  }, [visibleActivities, graphStates, criteriaByActivity, plan, renameActivity, toggleNodeExpand])

  // ── Sync DB edges → RF edges ─────────────────────────────────────────────────
  useEffect(() => {
    setRfEdges(
      dbEdges.map(e => ({
        id: e.id,
        type: 'custom',
        source: e.from_activity_id,
        target: e.to_activity_id,
        label: e.condition_label ?? '',
        style: { stroke: '#475569' },
        data: { edge: e, onDelete: deleteEdge },
      })),
    )
  }, [dbEdges, deleteEdge])

  // ── Close panel if selected activity was deleted ──────────────────────────────
  useEffect(() => {
    if (selectedActivityId && !activities.find(a => a.id === selectedActivityId)) {
      setSelectedActivityId(null)
    }
  }, [activities, selectedActivityId])

  // Auto-focus plan name input
  useEffect(() => {
    if (editingPlanName) {
      setTimeout(() => { planNameInputRef.current?.select() }, 0)
    }
  }, [editingPlanName])

  // ── Computed ─────────────────────────────────────────────────────────────────
  const allExpanded = rfNodes.length > 0 && rfNodes.every(n => n.data.expanded)
  const selectedActivity = visibleActivities.find(a => a.id === selectedActivityId) ?? null

  // ── Plan management ──────────────────────────────────────────────────────────

  async function savePlanName() {
    setEditingPlanName(false)
    const trimmed = planNameDraft.trim()
    if (!trimmed || !plan || trimmed === plan.name) return
    setPlan({ ...plan, name: trimmed })
    await supabase.from('plans').update({ name: trimmed }).eq('id', planId)
  }

  async function toggleArchivePlan() {
    if (!plan) return
    setShowPlanMenu(false)
    const newStatus = plan.status === 'archived' ? 'active' : 'archived'
    setPlan({ ...plan, status: newStatus })
    await supabase.from('plans').update({ status: newStatus }).eq('id', planId)
  }

  async function deletePlan() {
    if (!plan) return
    setShowPlanMenu(false)
    setConfirmingPlanDelete(false)
    await supabase.from('plans').delete().eq('id', planId)
    navigate('/')
  }

  // ── Activity interactions ─────────────────────────────────────────────────────

  async function addActivity() {
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

    if (!error && data) setSelectedActivityId(data.id)
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
      setRfEdges(prev => addEdge({
        id: data.id,
        type: 'custom',
        source,
        target,
        label,
        style: { stroke: '#475569' },
        data: { onDelete: deleteEdge },
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

  // Soft-delete: remove from UI immediately, defer DB delete by 5s for undo
  function deleteActivity(id: string) {
    const name = activities.find(a => a.id === id)?.name ?? 'Activity'
    setSelectedActivityId(null)
    setRfNodes(prev => prev.filter(n => n.id !== id))
    setPendingDeleteId(id)
    setPendingDeleteName(name)

    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    deleteTimerRef.current = setTimeout(() => {
      supabase.from('activities').delete().eq('id', id)
      setPendingDeleteId(null)
      setPendingDeleteName('')
    }, 5000)
  }

  function undoDelete() {
    if (!pendingDeleteId) return
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    // Activity still in DB — clearing pendingDeleteId causes visibleActivities to include
    // it again, which triggers the sync effect to restore the node in rfNodes.
    setPendingDeleteId(null)
    setPendingDeleteName('')
  }

  function dismissUndo() {
    if (!pendingDeleteId) return
    // Commit the delete immediately instead of waiting for the timer
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    supabase.from('activities').delete().eq('id', pendingDeleteId)
    setPendingDeleteId(null)
    setPendingDeleteName('')
  }

  const creatingFromHandle = useRef(false)

  const onNodeDoubleClick: NodeMouseHandler = useCallback((e, node) => {
    if (creatingFromHandle.current) return

    const target = e.target as HTMLElement
    if (target.tagName === 'P' || target.tagName === 'INPUT' || target.tagName === 'BUTTON') return

    const nodeEl = (e.target as HTMLElement).closest('.react-flow__node') as HTMLElement | null
    if (!nodeEl) return
    const rect = nodeEl.getBoundingClientRect()
    const side: 'left' | 'right' = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right'

    creatingFromHandle.current = true

    const source = visibleActivities.find(a => a.id === node.id)
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
  }, [visibleActivities, planId])

  const onNodesDelete = useCallback((deleted: ActivityNodeType[]) => {
    setSelectedActivityId(null)
    for (const node of deleted) {
      supabase.from('activities').delete().eq('id', node.id)
    }
  }, [])

  function toggleAllNodes() {
    const next = !allExpanded
    setRfNodes(prev => prev.map(n => ({ ...n, data: { ...n.data, expanded: next } })))
  }

  async function layoutHorizontal() {
    const STEP = 256 + 52
    const sorted = [...rfNodes].sort((a, b) => a.position.x - b.position.x)
    const updated = sorted.map((node, i) => ({ ...node, position: { x: i * STEP, y: 0 } }))
    setRfNodes(updated)
    for (const node of updated) {
      supabase.from('activities')
        .update({ position_x: Math.round(node.position.x), position_y: 0 })
        .eq('id', node.id)
    }
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 50)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

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
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white text-sm px-2 py-1 -mx-2 rounded hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          ← <span className="hidden sm:inline">Plans</span>
        </button>
        <span className="text-slate-700 flex-shrink-0">|</span>

        {/* Plan name — inline editable */}
        {editingPlanName ? (
          <input
            ref={planNameInputRef}
            value={planNameDraft}
            onChange={e => setPlanNameDraft(e.target.value)}
            onBlur={savePlanName}
            onKeyDown={e => {
              if (e.key === 'Enter') savePlanName()
              if (e.key === 'Escape') setEditingPlanName(false)
              e.stopPropagation()
            }}
            className="text-sm font-medium text-white bg-slate-800 border border-slate-600 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-0 max-w-40 sm:max-w-56"
          />
        ) : (
          <button
            onClick={() => { setPlanNameDraft(plan.name); setEditingPlanName(true) }}
            className="text-sm font-medium text-white hover:text-slate-300 truncate max-w-28 sm:max-w-56 text-left"
            title="Click to rename"
          >
            {plan.name}
          </button>
        )}

        {plan.status === 'archived' && (
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex-shrink-0">Archived</span>
        )}

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {/* Help */}
          <button
            onClick={() => setShowHelp(true)}
            className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors text-sm font-medium"
            title="How the graph works"
          >
            ?
          </button>

          {/* Layout */}
          <button
            onClick={layoutHorizontal}
            className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 flex items-center gap-1.5"
            title="Arrange activities in a horizontal row"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
              <rect x="1" y="4" width="3" height="6" rx="0.75" fill="currentColor" opacity="0.7" />
              <rect x="5.5" y="4" width="3" height="6" rx="0.75" fill="currentColor" opacity="0.7" />
              <rect x="10" y="4" width="3" height="6" rx="0.75" fill="currentColor" opacity="0.7" />
            </svg>
            <span className="hidden sm:inline">Layout</span>
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={toggleAllNodes}
            className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 flex items-center gap-1.5"
            title={allExpanded ? 'Collapse all nodes' : 'Expand all nodes'}
          >
            <span>{allExpanded ? '⊟' : '⊞'}</span>
            <span className="hidden sm:inline">{allExpanded ? 'Collapse' : 'Expand'}</span>
          </button>

          {/* Add activity */}
          <button
            onClick={addActivity}
            className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 text-sm text-white flex items-center gap-1"
          >
            <span>+</span>
            <span className="hidden sm:inline"> Add activity</span>
          </button>

          {/* Plan ⋯ menu */}
          <div className="relative">
            <button
              onClick={() => { setShowPlanMenu(v => !v); setConfirmingPlanDelete(false) }}
              className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Plan options"
            >
              ⋯
            </button>
            {showPlanMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPlanMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">
                  <button
                    onClick={toggleArchivePlan}
                    className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    {plan.status === 'archived' ? 'Unarchive plan' : 'Archive plan'}
                  </button>
                  <div className="border-t border-slate-800" />
                  {confirmingPlanDelete ? (
                    <div className="px-3 py-2.5 space-y-2">
                      <p className="text-xs text-red-400">Delete this plan and all its activities?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={deletePlan}
                          className="flex-1 text-xs font-medium text-white bg-red-700 hover:bg-red-600 rounded px-2 py-1 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmingPlanDelete(false)}
                          className="flex-1 text-xs text-slate-400 hover:text-slate-300 border border-slate-700 rounded px-2 py-1 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingPlanDelete(true)}
                      className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-slate-800 transition-colors"
                    >
                      Delete plan…
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Plan summary bar */}
      <PlanSummaryBar
        activities={visibleActivities}
        criteria={criteria}
        currency={plan.currency}
      />

      {/* Canvas + panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {/* Empty state */}
          {visibleActivities.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center space-y-1.5">
                <p className="text-slate-500 text-sm font-medium">No activities yet</p>
                <p className="text-slate-600 text-xs">Tap "+ Add activity" to get started</p>
              </div>
            </div>
          )}

          {/* Discovery hint — first 1-2 activities */}
          {visibleActivities.length >= 1 && visibleActivities.length <= 2 && (
            <div className="absolute bottom-16 inset-x-0 flex justify-center pointer-events-none z-10">
              <p className="text-slate-600 text-xs bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800">
                Double-click a node to create a connected activity
              </p>
            </div>
          )}

          {/* Mobile floating + button */}
          <button
            onClick={addActivity}
            className="md:hidden absolute bottom-20 right-4 z-20 w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-2xl flex items-center justify-center shadow-lg transition-colors"
            title="Add activity"
          >
            +
          </button>

          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_e, node) => setSelectedActivityId(node.id)}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeDragStop={onNodeDragStop}
            onNodesDelete={onNodesDelete}
            onPaneClick={() => setSelectedActivityId(null)}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: false }}
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
            <Controls position="bottom-left" />
          </ReactFlow>

          {pendingConnection && (
            <EdgeLabelModal onConfirm={confirmEdge} onCancel={() => setPendingConnection(null)} />
          )}
          {pendingHandleEdge && (
            <EdgeLabelModal onConfirm={confirmHandleEdge} onCancel={() => setPendingHandleEdge(null)} />
          )}
        </div>

        {/* Mobile backdrop */}
        {selectedActivity && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setSelectedActivityId(null)}
          />
        )}

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

      {/* Undo toast */}
      {pendingDeleteId && (
        <UndoToast
          activityName={pendingDeleteName}
          onUndo={undoDelete}
          onDismiss={dismissUndo}
        />
      )}

      {/* Help modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function PlanGraph() {
  const { id } = useParams<{ id: string }>()
  if (!id) return null
  return (
    <ReactFlowProvider>
      <PlanGraphInner planId={id} />
    </ReactFlowProvider>
  )
}
