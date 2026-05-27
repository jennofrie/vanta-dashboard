import { describe, it, expect } from 'vitest'
import type { Severity, Device, ThreatEvent } from '@shared/types'
import { SEVERITIES } from '@shared/types'

describe('shared types', () => {
  it('exposes the four severities in order', () => {
    expect(SEVERITIES).toEqual(['Critical', 'High', 'Medium', 'Low'])
  })

  it('lets values be assigned to the domain types', () => {
    const sev: Severity = 'High'
    const device: Device = {
      name: 'x', type: 'Router', ico: 'router', mac: '00:00', ip: '10.0.0.1',
      online: true, signal: 90, role: 'Gateway'
    }
    const event: ThreatEvent = {
      sev, source: 'gw', title: 't', desc: 'd', time: 'now', region: 'LAN'
    }
    expect(device.online && event.sev === 'High').toBe(true)
  })
})
