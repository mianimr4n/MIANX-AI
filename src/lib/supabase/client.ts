import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Dev mode fallback: return a stub that logs calls
    return createDevStub()
  }

  return createBrowserClient(url, key)
}

// Dev stub for local development without Supabase
function createDevStub() {
  const stub = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signOut: async () => ({ error: null }),
    },
    from: (_table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not configured' } }) }), order: () => ({ limit: async () => ({ data: [], error: null, count: 0 }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not configured' } }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not configured' } }) }) }) }),
      delete: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not configured' } }) }) }) }),
    }),
  }
  return stub as ReturnType<typeof createBrowserClient>
}
