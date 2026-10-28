import { useState, type ReactNode } from 'react'

/**
 * Smoothly opens and closes its content by animating the grid row from 0fr to 1fr, which
 * works for content of any height. Content mounts on first open and then stays mounted so it
 * can animate closed; while closed it is inert, so its buttons and inputs can't be tabbed to.
 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const [opened, setOpened] = useState(open)
  if (open && !opened) setOpened(true)

  return (
    <div className={`collapse${open ? ' open' : ''}`} inert={!open}>
      <div className="collapse-inner">{opened && children}</div>
    </div>
  )
}
