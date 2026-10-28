import { useState } from 'react'
import { createPortal } from 'react-dom'
import { encode } from 'uqr'
import { deviceLink } from '../lib/browserKey'

/** Shows the private link (and a QR code) that makes another device share this browser's tickets. */
export function DeviceLink({ onClose }: { onClose: () => void }) {
  const link = deviceLink()
  const [copied, setCopied] = useState(false)
  const { data } = encode(link, { ecc: 'M' })
  const size = data.length

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the link is still selectable in the box.
    }
  }

  // Rendered at the end of <body>: inside an animated panel, position: fixed would be relative to the panel.
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel modal device-modal" role="dialog" aria-labelledby="device-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="device-title">Use on another device</h2>
        <p className="muted">Scan this code or open the link on your phone or another computer. Both will then show the same tickets, including new ones.</p>
        <svg className="qr" viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label="QR code for the device link" shapeRendering="crispEdges">
          <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" />
          <path
            fill="#141a2a"
            d={data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : ''))).join('')}
          />
        </svg>
        <div className="inline-form">
          <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Device link" />
          <button className="btn secondary" type="button" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="muted">Keep this link private: anyone with it can see your tickets.</p>
        <div className="row-end">
          <button className="btn primary" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
