import { describe, it, expect } from 'vitest'
import type { DiscoveredHost, Device } from '@shared/types'
import { DEVICE_CLASSES } from '@shared/types'

describe('device types', () => {
  it('exposes device classes', () => {
    expect(DEVICE_CLASSES).toContain('router')
    expect(DEVICE_CLASSES).toContain('unknown')
  })
  it('DiscoveredHost carries identity + classification fields', () => {
    const h: DiscoveredHost = {
      ip: '10.0.0.5', mac: 'AA:BB:CC:DD:EE:FF', hostname: 'box.local',
      vendor: 'Acme', online: true, latencyMs: 7, deviceClass: 'router',
      services: ['_http._tcp'], firstSeen: 1, lastSeen: 2
    }
    const d: Device = {
      name: 'box', type: 'Router', ico: 'router', mac: h.mac, ip: h.ip,
      online: true, signal: 100, role: 'Gateway'
    }
    expect(d.ip).toBe(h.ip)
  })
})
