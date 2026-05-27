import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useScan } from './useScan'
import type { ScanResult } from '@shared/types'

const empty: ScanResult = { scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }

describe('useScan', () => {
  let runSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    runSpy = vi.fn().mockResolvedValue(undefined)
    let cb: ((r: ScanResult) => void) | null = null
    ;(window as unknown as { vanta: unknown }).vanta = {
      ping: vi.fn(),
      devices: { list: vi.fn().mockResolvedValue([]), subscribe: () => () => {} },
      stats: { current: vi.fn().mockResolvedValue({ rxMbps: 0, txMbps: 0, rxHistory: [], txHistory: [] }), subscribe: () => () => {} },
      scan: { run: runSpy, current: vi.fn().mockResolvedValue(empty), subscribe: (fn: (r: ScanResult) => void) => { cb = fn; return () => { cb = null } } }
    }
    ;(window as unknown as { __emitScan: (r: ScanResult) => void }).__emitScan = (r) => cb?.(r)
  })

  it('loads current, applies live updates, and run() calls the bridge', async () => {
    const { result } = renderHook(() => useScan())
    await waitFor(() => expect(result.current.result.scanning).toBe(false))
    act(() => result.current.run())
    expect(runSpy).toHaveBeenCalledTimes(1)
    act(() => (window as unknown as { __emitScan: (r: ScanResult) => void }).__emitScan({ ...empty, scanning: true }))
    expect(result.current.result.scanning).toBe(true)
  })
})
