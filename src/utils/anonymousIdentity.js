import { supabase, hasSupabaseConfig } from '../supabase/client.js'

const USER_ID_KEY = 'anonymous_chat_user_id'
const USER_NAME_KEY = 'anonymous_chat_user_name'
const NAME_PREFIXES = ['Anonymous', 'Guest', 'User']

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function makeFallbackId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function makeName() {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)]
  const number = Math.floor(10 + Math.random() * 990)
  return `${prefix}-${number}`
}

/**
 * Ensures a Supabase anonymous authentication session exists
 * and returns the authenticated user object (auth.uid()).
 */
export async function ensureAnonymousUser() {
  if (!hasSupabaseConfig) return null

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user?.id) {
      localStorage.setItem(USER_ID_KEY, session.user.id)
      return session.user
    }

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) {
      console.warn(
        'Supabase Anonymous Sign-In note (check if enabled in Dashboard > Authentication > Providers):',
        error.message,
      )
    } else if (data?.user?.id) {
      localStorage.setItem(USER_ID_KEY, data.user.id)
      return data.user
    }
  } catch (err) {
    console.warn('Anonymous session init failed:', err)
  }

  return null
}

/**
 * Returns current identity with real auth.uid() when available.
 */
export function getAnonymousIdentity() {
  let id = localStorage.getItem(USER_ID_KEY)
  let name = localStorage.getItem(USER_NAME_KEY)

  // Ensure id is always a valid UUID to match database UUID columns
  if (!id || !UUID_REGEX.test(id)) {
    id = makeFallbackId()
    localStorage.setItem(USER_ID_KEY, id)
  }

  if (!name) {
    name = makeName()
    localStorage.setItem(USER_NAME_KEY, name)
  }

  return { id, name }
}

export function setAnonymousName(name) {
  if (name && name.trim()) {
    localStorage.setItem(USER_NAME_KEY, name.trim())
  }
}
