import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-sm space-y-4 px-6">
          <h1 className="text-2xl font-semibold text-white">Check your email</h1>
          <p className="text-sm text-slate-400">
            We sent a confirmation link to <span className="text-slate-200">{email}</span>.
            Open it to activate your account.
          </p>
          <Link to="/sign-in" className="block text-sm text-slate-200 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">InvestInsight</h1>
          <p className="mt-1 text-sm text-slate-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="display-name" className="block text-sm text-slate-300">
              Name
            </label>
            <input
              id="display-name"
              type="text"
              autoComplete="name"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-slate-200 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
