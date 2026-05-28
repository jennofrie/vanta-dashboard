import { useEffect, useState } from 'react'
import type { ThreatsState } from '@shared/types'

const EMPTY: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }

export function useThreats(): ThreatsState {
  const [state, setState] = useState<ThreatsState>(EMPTY)
  useEffect(() => {
    let mounted = true
    window.vanta.threats.current().then((s) => { if (mounted) setState(s) })
    const unsubscribe = window.vanta.threats.subscribe((s) => { if (mounted) setState(s) })
    return () => { mounted = false; unsubscribe() }
  }, [])
  return state
}
