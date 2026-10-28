import { useLayoutEffect, useRef, type ReactNode } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

/**
 * A row of buttons with one highlight that slides to the selected option. The highlight is
 * positioned by measuring the active button, so labels of any width (and wrapping) work.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className: string
  label: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const box = root.current
    const pill = indicator.current
    if (!box || !pill) return
    const place = () => {
      const active = box.querySelector<HTMLButtonElement>(`[data-value="${value}"]`)
      if (!active) return
      pill.style.width = `${active.offsetWidth}px`
      pill.style.height = `${active.offsetHeight}px`
      pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
    }
    place()
    // Slide only after the first placement, so the highlight doesn't fly in from the corner on load.
    const frame = requestAnimationFrame(() => (pill.dataset.ready = 'true'))
    // Labels can change width (e.g. a ticket count going from 9 to 10), so follow size changes too.
    const observer = new ResizeObserver(place)
    observer.observe(box)
    box.querySelectorAll('button').forEach((b) => observer.observe(b))
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [value, options.length])

  return (
    <div ref={root} className={`segmented-control ${className}`} role="tablist" aria-label={label}>
      <span ref={indicator} className="seg-indicator" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          data-value={o.value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
