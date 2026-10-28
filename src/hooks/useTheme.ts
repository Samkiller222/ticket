import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'ticket-desk:theme'

function initialTheme(): Theme {
  // index.html sets data-theme before first paint; start from whatever it chose.
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Light or dark, saved per browser. Follows the device setting until the visitor picks one. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Not saved; the choice still applies for this visit.
    }
    setTheme(next)
  }

  return { theme, toggle }
}
