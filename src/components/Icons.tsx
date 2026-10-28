// Small inline icons (stroke follows currentColor). Decorative, so hidden from screen readers.
type P = { size?: number }

function Svg({ size = 18, children }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const LogoIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
    <rect x="2" y="14" width="5" height="7" rx="2" />
    <rect x="17" y="14" width="5" height="7" rx="2" />
  </Svg>
)
export const SunIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)
export const MoonIcon = (p: P) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Svg>
)
export const ChevronIcon = (p: P) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)
export const SearchIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
)
export const InboxIcon = (p: P) => (
  <Svg {...p}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
  </Svg>
)
export const SendIcon = (p: P) => (
  <Svg {...p}>
    <path d="m22 2-7 20-4-9-9-4z" />
    <path d="M22 2 11 13" />
  </Svg>
)

/** A check mark that draws itself, for the "ticket submitted" screen. */
export function SuccessCheck() {
  return (
    <svg className="success-check" width="64" height="64" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="24" fill="none" />
      <path fill="none" d="M15 27l7 7 15-15" />
    </svg>
  )
}
