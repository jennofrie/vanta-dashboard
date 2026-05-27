import { useEffect, useState } from 'react'
import type { Device } from '@shared/types'

export function useDevices(): { devices: Device[]; loading: boolean } {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    window.vanta.devices.list().then((list) => {
      if (mounted) {
        setDevices(list)
        setLoading(false)
      }
    })
    const unsubscribe = window.vanta.devices.subscribe((list) => {
      if (mounted) setDevices(list)
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return { devices, loading }
}
