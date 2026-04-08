interface Props {
  onClose: () => void
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${color}`}>{label}</span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

export default function HelpModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">How the graph works</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5">

          <Section title="Activity lifecycle">
            <p className="text-xs text-slate-400 leading-relaxed">
              Each activity moves through four stages. The stage controls its visual appearance on the graph.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge color="bg-indigo-900 text-indigo-300" label="created" />
                <span className="text-xs text-slate-400">Planned but not started yet</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge color="bg-blue-900 text-blue-300" label="active" />
                <span className="text-xs text-slate-400">Currently in progress</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge color="bg-amber-900 text-amber-300" label="evaluated" />
                <span className="text-xs text-slate-400">Completed — set an outcome to unlock paths</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge color="bg-slate-800 text-slate-500" label="archived" />
                <span className="text-xs text-slate-400">Closed out, no longer active</span>
              </div>
            </div>
          </Section>

          <Section title="Decision paths (edges)">
            <p className="text-xs text-slate-400 leading-relaxed">
              Edges between activities can have a <span className="text-slate-200 font-medium">condition label</span> (e.g. <span className="text-slate-200">pass</span>, <span className="text-slate-200">fail</span>, <span className="text-slate-200">high</span>, <span className="text-slate-200">low</span>).
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              When an upstream activity is set to <Badge color="bg-amber-900 text-amber-300 inline" label="evaluated" /> with an <span className="text-slate-200 font-medium">Outcome</span>, only the edges whose label <span className="text-slate-200 font-medium">matches</span> that outcome stay active. All other downstream paths become locked.
            </p>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2 text-xs text-slate-400">
              <p className="font-medium text-slate-300">Example:</p>
              <p>Activity A is evaluated with outcome <span className="text-amber-300 font-medium">"pass"</span></p>
              <p>→ Edge labeled <span className="text-white font-medium">"pass"</span> → Activity B stays <span className="text-white font-medium">active</span></p>
              <p>→ Edge labeled <span className="text-white font-medium">"fail"</span> → Activity C becomes <span className="text-slate-500 font-medium">locked</span></p>
            </div>
          </Section>

          <Section title="Graph states">
            <p className="text-xs text-slate-400 leading-relaxed">
              The visual state of each node is computed automatically from its upstream context.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-400"><span className="text-slate-200 font-medium">Active</span> — reachable and not blocked</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
                <span className="text-xs text-slate-400"><span className="text-slate-200 font-medium">Locked</span> — blocked by an upstream outcome mismatch (dimmed)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-slate-700 flex-shrink-0" />
                <span className="text-xs text-slate-400"><span className="text-slate-200 font-medium">Closed</span> — path was eliminated (heavily dimmed, strikethrough name)</span>
              </div>
            </div>
          </Section>

          <Section title="Tips">
            <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>• <span className="text-slate-200">Double-click</span> a node to create a connected activity on either side</li>
              <li>• <span className="text-slate-200">Drag</span> from a handle (left/right edge of a node) to connect two existing activities</li>
              <li>• <span className="text-slate-200">Click an edge</span> then hover to reveal the delete button</li>
              <li>• <span className="text-slate-200">Select a node</span> and press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Del</kbd> to delete it</li>
            </ul>
          </Section>

        </div>
      </div>
    </div>
  )
}
