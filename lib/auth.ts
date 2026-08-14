import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

type AuthResult =
  | { user: User; error?: never }
  | { user?: never; error: NextResponse }

export async function requireUser(): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorised.' }, { status: 401 }),
    }
  }

  return { user }
}

export async function requireAdminApi(): Promise<AuthResult> {
  const auth = await requireUser()
  if (auth.error) return auth

  const service = createServiceSupabaseClient()
  const { data: profile, error } = await service
    .from('profiles')
    .select('role, is_active')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error || profile?.role !== 'admin' || profile.is_active === false) {
    return {
      error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }),
    }
  }

  return auth
}

export async function getTrustedProfile(userId: string) {
  const service = createServiceSupabaseClient()
  return service
    .from('profiles')
    .select('id, full_name, email, department, role, is_active')
    .eq('id', userId)
    .maybeSingle()
}
