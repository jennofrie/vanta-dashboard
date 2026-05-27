import { useEffect, useState, useCallback } from 'react'
import type { ScanResult } from '@shared/types'

const EMPTY: ScanResult = { scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }

export function useScan(): { result: ScanResult; run: () => void } {
  const [result, setResult] = useState<ScanResult>(EMPTY)
  useEffect(() => {
    let mounted = true
    window.vanta.scan.current().then((r) => { if (mounted) setResult(r) })
    const unsubscribe = window.vanta.scan.subscribe((r) => { if (mounted) setResult(r) })
    return () => { mounted = false; unsubscribe() }
  }, [])
  const run = useCallback(() => { void window.vanta.scan.run() }, [])
  return { result, run }
}
