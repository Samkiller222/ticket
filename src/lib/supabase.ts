import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

// Null when the env vars are missing, so the page can explain instead of crashing.
export const supabase = url && key
  ? createClient(url, key, {
      // GitHub Pages serves every samkiller222 site from one origin; a separate key keeps this
      // app's login apart from the Life dashboard's (signing out here won't sign out there).
      auth: { storageKey: 'ticket-desk-auth' },
    })
  : null

/** Admin logins use a name; Supabase needs an email, so plain names map to an internal address. */
export function loginEmail(name: string): string {
  const n = name.trim().toLowerCase()
  return n.includes('@') ? n : `${n}@ticket-desk.invalid`
}
