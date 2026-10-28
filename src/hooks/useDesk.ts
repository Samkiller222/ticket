import { useCallback, useEffect, useState } from 'react'
import { DESK_KEY, loadDesk, saveDesk } from '../lib/storage'
import type { Desk } from '../lib/tickets'

/** The whole desk, saved to local storage and kept in sync across open tabs. */
export function useDesk() {
  const [desk, setDesk] = useState<Desk>(loadDesk)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DESK_KEY) setDesk(loadDesk())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = useCallback((change: (d: Desk) => Desk) => {
    setDesk((d) => {
      const next = change(d)
      saveDesk(next)
      return next
    })
  }, [])

  return { desk, update }
}
