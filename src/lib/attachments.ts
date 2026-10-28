import { browserKeys } from './browserKey'
import { supabase } from './supabase'

export const MAX_FILES = 3
export const MAX_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

/** Why a file can't be attached, or '' when it can. Mirrors the bucket's own limits. */
export function fileProblem(file: { type: string; size: number }): string {
  if (!IMAGE_TYPES.includes(file.type)) return 'Only PNG, JPEG, GIF or WebP images can be attached.'
  if (file.size > MAX_BYTES) return 'Each screenshot must be 5 MB or smaller.'
  return ''
}

/** A storage-safe file name (the bucket path is "<uuid>/<name>"). */
export function safeName(name: string): string {
  const cleaned = name.replace(/[^\w.-]+/g, '_').replace(/^[._]+/, '').slice(0, 100)
  return cleaned || 'screenshot.png'
}

/** Uploads screenshots and links them to a ticket. Returns how many failed. */
export async function uploadAttachments(ticketId: number, files: File[]): Promise<number> {
  let failed = 0
  for (const file of files) {
    const path = `${crypto.randomUUID()}/${safeName(file.name)}`
    const upload = await supabase!.storage.from('ticket-attachments').upload(path, file, { contentType: file.type })
    const link = upload.error
      ? upload
      : await supabase!.rpc('ticket_attach', { p_owner_keys: browserKeys(), p_ticket_id: ticketId, p_path: path, p_name: file.name })
    if (link.error) failed++
  }
  return failed
}
