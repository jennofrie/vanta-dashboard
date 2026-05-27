import { describe, it, expect } from 'vitest'
import type { NetStats, Device } from '@shared/types'

describe('stats types', () => {
  it('NetStats carries current rates + history', () => {
    const s: NetStats = { rxMbps: 12.5, txMbps: 3.2, rxHistory: [1, 2], txHistory: [0, 1] }
    expect(s.rxHistory).toHaveLength(2)
  })
  it('Device accepts an optional vendor', () => {
    const d: Device = {
      name: 'x', type: 'Router', ico: 'router', mac: 'M', ip: '10.0.0.1',
      online: true, signal: 100, role: 'Gateway', vendor: 'Ubiquiti'
    }
    expect(d.vendor).toBe('Ubiquiti')
  })
})
