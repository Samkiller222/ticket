const KEY = 'ticket-desk:browser-key'

/**
 * A random secret saved in this browser and sent with every ticket, so "Your tickets" can list
 * them without a login. The database stores only its hash. Clearing site data starts a new list.
 */
export function browserKey(): string {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing && existing.length >= 32) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(KEY, fresh)
    return fresh
  } catch {
    // Storage blocked (private mode on some browsers): a per-visit key still lets this visit work.
    return sessionKey
  }
}

const sessionKey = crypto.randomUUID()

/** SHA-256 of the key, matching ticket_key_hash() in the database. Used as this browser's live-update topic. */
export function browserKeyHash(): Promise<string> {
  return sha256Hex(browserKey())
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
