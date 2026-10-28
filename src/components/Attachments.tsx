import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Attachment } from '../lib/tickets'

/** Screenshot thumbnails for the admin. The bucket is private, so each image gets a short-lived signed link. */
export function Attachments({ attachments }: { attachments: Attachment[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const paths = attachments.map((a) => a.path).filter((p): p is string => !!p)
  const key = paths.join('|')

  useEffect(() => {
    if (!key) return
    let active = true
    supabase!.storage
      .from('ticket-attachments')
      .createSignedUrls(key.split('|'), 3600)
      .then(({ data }) => {
        if (!active || !data) return
        setUrls(Object.fromEntries(data.flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl]] : []))))
      })
    return () => {
      active = false
    }
  }, [key])

  if (paths.length === 0) return null
  return (
    <div className="shots">
      {attachments.map((a) =>
        a.path && urls[a.path] ? (
          <a key={a.path} className="shot" href={urls[a.path]} target="_blank" rel="noreferrer" title={`Open ${a.name}`}>
            <img src={urls[a.path]} alt={a.name} loading="lazy" />
          </a>
        ) : (
          <div key={a.path ?? a.name} className="shot loading" title={a.name} />
        ),
      )}
    </div>
  )
}
