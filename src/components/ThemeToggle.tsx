import { useTheme } from '../hooks/useTheme'
import { MoonIcon, SunIcon } from './Icons'

/** A light/dark switch: the knob slides across and swaps its icon. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      className={`theme-switch${dark ? ' on' : ''}`}
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <SunIcon size={13} />
        <MoonIcon size={13} />
      </span>
      <span className="theme-switch-knob" aria-hidden="true">
        <span key={theme} className="theme-icon">
          {dark ? <MoonIcon size={14} /> : <SunIcon size={14} />}
        </span>
      </span>
    </button>
  )
}
