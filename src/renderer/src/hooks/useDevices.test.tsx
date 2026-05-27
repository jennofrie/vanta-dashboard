import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDevices } from './useDevices'
import type { Device } from '@shared/types'

const d = (ip: string): Device => ({
  name: ip, type: 'Unknown', ico: 'globe', mac: ip, ip, online: true, signal: 100, role: 'Endpoint'
})

describe('useDevices', () => {
  beforeEach(() => {
    let cb: ((x: Device[]) => void) | null = null
    ;(window as unknown as { vanta: unknown }).vanta = {
      ping: vi.fn(),
      devices: {
        list: vi.fn().mockResolvedValue([d('10.0.0.1')]),
        subscribe: (fn: (x: Device[]) => void) => { cb = fn; return () => { cb = null } }
      }
    }
    ;(window as unknown as { __emit: (x: Device[]) => void }).__emit = (x) => cb?.(x)
  })

  it('loads the initial list then applies live updates', async () => {
    const { result } = renderHook(() => useDevices())
    await waitFor(() => expect(result.current.devices).toHaveLength(1))
    act(() => (window as unknown as { __emit: (x: Device[]) => void }).__emit([d('10.0.0.1'), d('10.0.0.2')]))
    expect(result.current.devices).toHaveLength(2)
  })
})
