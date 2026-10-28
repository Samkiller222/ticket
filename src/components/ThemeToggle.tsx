import { useTheme } from '../hooks/useTheme'
import { MoonIcon, SunIcon } from './Icons'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button className="icon-btn theme-toggle" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
      <span key={theme} className="theme-icon">
        {dark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  )
}
