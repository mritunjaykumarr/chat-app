import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey)

if (!hasSupabaseConfig) {
  console.warn('Supabase env vars are missing. Check your .env file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseKey || 'missing-supabase-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
  },
)
