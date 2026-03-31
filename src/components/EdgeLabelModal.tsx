import { useEffect, useRef, useState } from 'react'

interface Props {
  onConfirm: (label: string) => void
  onCancel: () => void
}

export default function EdgeLabelModal({ onConfirm, onCancel }: Props) {
  const [label, setLabel] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-80 rounded-xl bg-slate-900 border border-slate-700 p-5 shadow-xl space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Add edge condition</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Label this path — e.g. <span className="text-slate-300">pass</span>,{' '}
            <span className="text-slate-300">fail</span>,{' '}
            <span className="text-slate-300">low</span>,{' '}
            <span className="text-slate-300">high</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="condition label"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!label.trim()}
              className="flex-1 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add edge
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
