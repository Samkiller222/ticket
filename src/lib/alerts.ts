// New-ticket alerts for the admin: a short chime and, when allowed, a browser notification.
const SOUND_KEY = 'ticket-desk:alert-sound'

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    // Not saved; applies for this visit.
  }
}

let audio: AudioContext | null = null

/** Two soft rising tones, generated so there is no sound file to load. */
export function playChime(): void {
  try {
    audio ??= new AudioContext()
    const start = audio.currentTime
    for (const [i, freq] of [660, 880].entries()) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = start + i * 0.15
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + 0.45)
    }
  } catch {
    // Audio unavailable (or blocked until the page is clicked); the notification still shows.
  }
}

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined'
}

export function notify(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, tag: `${title}:${body}` })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}
