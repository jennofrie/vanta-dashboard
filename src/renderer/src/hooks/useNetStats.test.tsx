import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useNetStats } from './useNetStats'
import type { NetStats } from '@shared/types'

const s = (rx: number): NetStats => ({ rxMbps: rx, txMbps: 1, rxHistory: [rx], txHistory: [1] })

describe('useNetStats', () => {
  beforeEach(() => {
    let cb: ((x: NetStats) => void) | null = null
    ;(window as unknown as { vanta: unknown }).vanta = {
      ping: vi.fn(),
      devices: { list: vi.fn().mockResolvedValue([]), subscribe: () => () => {} },
      stats: {
        current: vi.fn().mockResolvedValue(s(5)),
        subscribe: (fn: (x: NetStats) => void) => { cb = fn; return () => { cb = null } }
      }
    }
    ;(window as unknown as { __emitStats: (x: NetStats) => void }).__emitStats = (x) => cb?.(x)
  })

  it('loads current then applies live updates', async () => {
    const { result } = renderHook(() => useNetStats())
    await waitFor(() => expect(result.current.rxMbps).toBe(5))
    act(() => (window as unknown as { __emitStats: (x: NetStats) => void }).__emitStats(s(42)))
    expect(result.current.rxMbps).toBe(42)
  })
})
