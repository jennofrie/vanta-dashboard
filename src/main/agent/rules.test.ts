import { describe, it, expect } from 'vitest'
import { applyRules } from './rules'
import type { DiscoveredHost, HostScan } from '@shared/types'

const host = (mac: string, over: Partial<DiscoveredHost> = {}): DiscoveredHost => ({
  mac, ip: '10.0.0.2', hostname: null, vendor: null, online: true, latencyMs: null,
  deviceClass: 'unknown', services: [], firstSeen: 1, lastSeen: 1, ...over
})
const scan = (mac: string, ports: number[] = [], sevs: string[] = []): HostScan => ({
  mac, ip: '10.0.0.2',
  openPorts: ports.map((p) => ({ port: p, service: null, version: null })),
  vulns: sevs.map((s, i) => ({
    id: `EXPOSURE-${ports[i] ?? 0}`,
    title: 'risk',
    severity: s as 'Low' | 'Medium' | 'High' | 'Critical',
    score: 7,
    system: 'host',
    patch: 'Harden',
    age: '—'
  })),
  worstSeverity: sevs.length ? sevs[0] as 'Low' | 'Medium' | 'High' | 'Critical' : null
})

describe('applyRules', () => {
  it('NEW_DEVICE: fires when a MAC appears that was not in prev', () => {
    const events = applyRules({ prevHosts: [], currHosts: [host('AA')], prevScans: [], currScans: [], prevGatewayIp: null, currGatewayIp: null, now: () => 1000 })
    expect(events.some((e) => e.title.toLowerCase().includes('new device'))).toBe(true)
    expect(events[0]!.sev).toBe('Medium')
  })

  it('DEVICE_OFFLINE: fires when a previously online host goes offline', () => {
    const events = applyRules({ prevHosts: [host('AA', { online: true })], currHosts: [host('AA', { online: false })], prevScans: [], currScans: [], prevGatewayIp: null, currGatewayIp: null, now: () => 1 })
    expect(events.some((e) => e.title.toLowerCase().includes('offline'))).toBe(true)
  })

  it('RISKY_EXPOSURE: fires when a new exposure finding appears for a host', () => {
    const events = applyRules({ prevHosts: [host('AA')], currHosts: [host('AA')], prevScans: [scan('AA')], currScans: [scan('AA', [23], ['High'])], prevGatewayIp: null, currGatewayIp: null, now: () => 1 })
    expect(events.some((e) => e.sev === 'High')).toBe(true)
    expect(events.some((e) => e.title.toLowerCase().includes('exposure'))).toBe(true)
  })

  it('NEW_OPEN_PORT: fires when a port appears that was not in the prev scan', () => {
    const events = applyRules({ prevHosts: [host('AA')], currHosts: [host('AA')], prevScans: [scan('AA')], currScans: [scan('AA', [80])], prevGatewayIp: null, currGatewayIp: null, now: () => 1 })
    expect(events.some((e) => e.title.toLowerCase().includes('port'))).toBe(true)
  })

  it('GATEWAY_CHANGE: fires when the gateway IP changes', () => {
    const events = applyRules({ prevHosts: [], currHosts: [], prevScans: [], currScans: [], prevGatewayIp: '10.0.0.1', currGatewayIp: '192.168.1.1', now: () => 1 })
    expect(events.some((e) => e.title.toLowerCase().includes('gateway'))).toBe(true)
    expect(events[0]!.sev).toBe('High')
  })

  it('returns nothing when nothing changed', () => {
    const h = host('AA')
    expect(applyRules({ prevHosts: [h], currHosts: [h], prevScans: [], currScans: [], prevGatewayIp: null, currGatewayIp: null, now: () => 1 })).toHaveLength(0)
  })
})
