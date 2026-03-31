import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function Setup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orgName, setOrgName] = useState('')
  const [displayName, setDisplayName] = useState(
    (user?.user_metadata?.display_name as string | undefined) ?? '',
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.rpc('setup_user', {
      p_org_name: orgName.trim(),
      p_display_name: displayName.trim(),
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Set up your account</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create your organization to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="display-name" className="block text-sm text-slate-300">
              Your name
            </label>
            <input
              id="display-name"
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="org-name" className="block text-sm text-slate-300">
              Organization name
            </label>
            <input
              id="org-name"
              type="text"
              required
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="e.g. Acme Ventures"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up…' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  )
}
