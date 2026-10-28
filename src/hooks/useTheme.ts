import { useState } from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'
const KEY = 'ticket-desk:theme'

function initialTheme(): Theme {
  // index.html sets data-theme before first paint; start from whatever it chose.
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Light or dark, saved per browser. Follows the device setting until the visitor picks one. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Not saved; the choice still applies for this visit.
    }
    const apply = () => {
      document.documentElement.dataset.theme = next
      flushSync(() => setTheme(next))
    }
    // Crossfade the whole page between themes where the browser supports view transitions.
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    if ('startViewTransition' in document && !reduceMotion) document.startViewTransition(apply)
    else apply()
  }

  return { theme, toggle }
}
