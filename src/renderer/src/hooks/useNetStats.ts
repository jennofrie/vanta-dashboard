import { useEffect, useState } from 'react'
import type { NetStats } from '@shared/types'

const EMPTY: NetStats = { rxMbps: 0, txMbps: 0, rxHistory: [], txHistory: [] }

export function useNetStats(): NetStats {
  const [stats, setStats] = useState<NetStats>(EMPTY)
  useEffect(() => {
    let mounted = true
    window.vanta.stats.current().then((s) => { if (mounted) setStats(s) })
    const unsubscribe = window.vanta.stats.subscribe((s) => { if (mounted) setStats(s) })
    return () => { mounted = false; unsubscribe() }
  }, [])
  return stats
}
