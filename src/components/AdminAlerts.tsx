import { useState } from 'react'
import { notificationsSupported, playChime, setSoundEnabled, soundEnabled } from '../lib/alerts'
import { BellIcon, MuteIcon, SoundIcon } from './Icons'

/** Header buttons for the admin: chime on/off, and turning on browser notifications. */
export function AdminAlerts() {
  const [sound, setSound] = useState(soundEnabled)
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'denied'))

  function toggleSound() {
    const next = !sound
    setSoundEnabled(next)
    setSound(next)
    if (next) playChime()
  }

  async function enableNotifications() {
    setPermission(await Notification.requestPermission())
  }

  return (
    <>
      <button className="icon-btn" onClick={toggleSound} aria-pressed={sound} title={sound ? 'New-ticket sound is on' : 'New-ticket sound is off'} aria-label="New-ticket sound">
        {sound ? <SoundIcon size={17} /> : <MuteIcon size={17} />}
      </button>
      {notificationsSupported() && permission === 'default' && (
        <button className="icon-btn attention" onClick={enableNotifications} title="Get a notification when a ticket comes in" aria-label="Turn on notifications">
          <BellIcon size={17} />
        </button>
      )}
    </>
  )
}
