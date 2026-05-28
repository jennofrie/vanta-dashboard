import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useThreats } from './useThreats'
import type { ThreatsState } from '@shared/types'

const empty: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }

describe('useThreats', () => {
  beforeEach(() => {
    let cb: ((s: ThreatsState) => void) | null = null
    ;(window as unknown as { vanta: unknown }).vanta = {
      ping: vi.fn(),
      devices: { list: vi.fn().mockResolvedValue([]), subscribe: () => () => {} },
      stats: { current: vi.fn().mockResolvedValue({ rxMbps: 0, txMbps: 0, rxHistory: [], txHistory: [] }), subscribe: () => () => {} },
      scan: { run: vi.fn(), current: vi.fn().mockResolvedValue({ scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }), subscribe: () => () => {} },
      threats: { current: vi.fn().mockResolvedValue(empty), subscribe: (fn: (s: ThreatsState) => void) => { cb = fn; return () => { cb = null } } }
    }
    ;(window as unknown as { __emitThreats: (s: ThreatsState) => void }).__emitThreats = (s) => cb?.(s)
  })

  it('loads current then applies live updates', async () => {
    const { result } = renderHook(() => useThreats())
    await waitFor(() => expect(result.current.activeCount).toBe(0))
    act(() => (window as unknown as { __emitThreats: (s: ThreatsState) => void }).__emitThreats({
      events: [{ sev: 'High', source: '10.0.0.5', title: 'New device joined', desc: 'MAC BB', time: 'just now', region: 'LAN' }],
      activeCount: 1,
      lastUpdated: 1000
    }))
    expect(result.current.events).toHaveLength(1)
    expect(result.current.activeCount).toBe(1)
  })
})
