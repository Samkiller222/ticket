import { seedDesk, type Desk } from './tickets'

export const DESK_KEY = 'ticket-desk:v1'

export function loadDesk(): Desk {
  try {
    const raw = localStorage.getItem(DESK_KEY)
    if (raw) return JSON.parse(raw) as Desk
  } catch {
    // Unreadable or blocked storage: start fresh.
  }
  return seedDesk()
}

export function saveDesk(desk: Desk): void {
  try {
    localStorage.setItem(DESK_KEY, JSON.stringify(desk))
  } catch {
    // Storage full or blocked; the in-memory copy still works for this visit.
  }
}
