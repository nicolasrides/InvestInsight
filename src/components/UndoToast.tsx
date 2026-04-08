interface Props {
  activityName: string
  onUndo: () => void
  onDismiss: () => void
}

export default function UndoToast({ activityName, onUndo, onDismiss }: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl min-w-64">
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="flex-1 text-sm text-slate-300 truncate">
          <span className="text-slate-500">Deleted</span> {activityName}
        </p>
        <button
          onClick={onUndo}
          className="text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors flex-shrink-0"
        >
          Undo
        </button>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 text-lg leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>
      {/* Countdown bar */}
      <div className="h-0.5 bg-slate-800">
        <div className="h-full bg-slate-500 animate-countdown" />
      </div>
    </div>
  )
}
