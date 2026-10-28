const KEY = 'ticket-desk:browser-key'
const LINKED = 'ticket-desk:linked-keys'

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

function linkedKeys(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(LINKED) ?? '[]')
    return Array.isArray(list) ? list.filter((k): k is string => typeof k === 'string' && k.length >= 32) : []
  } catch {
    return []
  }
}

/** Every key this browser holds: its own first, then older keys kept after linking a device. */
export function browserKeys(): string[] {
  return [...new Set([browserKey(), ...linkedKeys()])].slice(0, 20)
}

/** The private link that makes another device share this browser's tickets. */
export function deviceLink(): string {
  return `${location.origin}${location.pathname}#key=${browserKey()}`
}

/**
 * If the page was opened from a device link, adopt that key so both devices share one list (new
 * tickets from either show on both). This browser's previous key is kept, so its older tickets stay
 * listed. The key is removed from the address bar straight away. Returns true when a key was adopted.
 */
export function adoptKeyFromLink(): boolean {
  const match = location.hash.match(/^#key=([0-9a-f-]{36})$/i)
  if (!match) return false
  history.replaceState(null, '', location.pathname + location.search)
  const incoming = match[1].toLowerCase()
  const current = browserKey()
  if (incoming === current) return false
  try {
    localStorage.setItem(LINKED, JSON.stringify([...new Set([current, ...linkedKeys()])].filter((k) => k !== incoming).slice(0, 19)))
    localStorage.setItem(KEY, incoming)
    sessionStorage.setItem(JUST_LINKED, '1')
    return true
  } catch {
    return false
  }
}

const JUST_LINKED = 'ticket-desk:just-linked'

/** True once after a device link was adopted (survives the reload that follows a pasted link). */
function takeJustLinked(): boolean {
  try {
    const was = sessionStorage.getItem(JUST_LINKED) === '1'
    sessionStorage.removeItem(JUST_LINKED)
    return was
  } catch {
    return false
  }
}

/** Whether this page load adopted a key from a device link (read once, at startup). */
export const linkedOnLoad = typeof location !== 'undefined' && (adoptKeyFromLink() || takeJustLinked())

// A device link pasted into a tab that already has the site open only changes the hash, so adopt
// it and reload to load the shared tickets.
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (adoptKeyFromLink()) location.reload()
  })
}

/** SHA-256 of a key, matching ticket_key_hash() in the database. Used as live-update topics. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
