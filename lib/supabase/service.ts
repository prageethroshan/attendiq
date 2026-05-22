import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS
// ONLY use in API Route Handlers (server-side), never in client components
export function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
