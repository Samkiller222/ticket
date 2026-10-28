// The admin PIN only hides the admin screen from casual users. Everything runs in the browser,
// so it is not real security: anyone with dev tools can read local storage.
const PIN_KEY = 'ticket-desk:pin'
const SESSION_KEY = 'ticket-desk:admin'
export const DEFAULT_PIN = '1234'

export async function hashPin(pin: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`ticket-desk:${pin}`))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function checkPin(pin: string): Promise<boolean> {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(PIN_KEY)
  } catch {
    // Fall back to the default PIN.
  }
  return (await hashPin(pin)) === (stored ?? (await hashPin(DEFAULT_PIN)))
}

export async function setPin(pin: string): Promise<void> {
  localStorage.setItem(PIN_KEY, await hashPin(pin))
}

export function isAdminSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function setAdminSession(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(SESSION_KEY, '1')
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Session just will not survive a reload.
  }
}
