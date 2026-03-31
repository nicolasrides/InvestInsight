import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-5 h-5 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
    </div>
  )
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()

  if (authLoading || profileLoading) return <Spinner />
  if (!user) return <Navigate to="/sign-in" replace />
  if (!profile) return <Navigate to="/setup" replace />

  return <>{children}</>
}
