import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { useAuth } from './useAuth'

export function useProfile() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setProfile(null); setLoading(false); return }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [user, authLoading])

  return { profile, loading: authLoading || loading }
}
