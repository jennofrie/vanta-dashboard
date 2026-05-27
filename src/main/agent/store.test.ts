import { describe, it, expect } from 'vitest'
import { InMemoryStore } from './store'
import type { DiscoveredHost } from '@shared/types'

const host = (ip: string, over: Partial<DiscoveredHost> = {}): DiscoveredHost => ({
  ip, mac: 'AA:BB:CC:00:00:01', hostname: null, vendor: null, online: true,
  latencyMs: 5, deviceClass: 'unknown', services: [], firstSeen: 1, lastSeen: 1, ...over
})

describe('InMemoryStore', () => {
  it('upserts by mac and lists hosts', () => {
    const s = new InMemoryStore()
    s.upsertHosts([host('10.0.0.2')])
    s.upsertHosts([host('10.0.0.3', { ip: '10.0.0.3', mac: 'AA:BB:CC:00:00:01', lastSeen: 9 })])
    // same mac → one record, latest ip/lastSeen win, firstSeen preserved
    expect(s.listHosts()).toHaveLength(1)
    expect(s.listHosts()[0]!.ip).toBe('10.0.0.3')
    expect(s.listHosts()[0]!.firstSeen).toBe(1)
    expect(s.listHosts()[0]!.lastSeen).toBe(9)
  })
  it('marks hosts not in the latest sweep as offline', () => {
    const s = new InMemoryStore()
    s.upsertHosts([host('10.0.0.2', { mac: 'M1' }), host('10.0.0.3', { mac: 'M2' })])
    s.reconcileOnline(['M1'])
    const byMac = Object.fromEntries(s.listHosts().map((h) => [h.mac, h]))
    expect(byMac['M1']!.online).toBe(true)
    expect(byMac['M2']!.online).toBe(false)
  })
})
