// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest'
import { unlinkSync } from 'node:fs'
import { JsonFileStore } from './jsonFileStore'

const TEST_PATH = '/tmp/vanta_test_state.json'
afterEach(() => { try { unlinkSync(TEST_PATH) } catch { /* file may not exist */ } })

describe('JsonFileStore', () => {
  it('persists hosts across instances', () => {
    const s1 = new JsonFileStore(TEST_PATH)
    s1.upsertHosts([{ mac: 'AA', ip: '10.0.0.1', hostname: null, vendor: null, online: true, latencyMs: null, deviceClass: 'unknown', services: [], firstSeen: 1, lastSeen: 1 }])
    // new instance reads the same file
    const s2 = new JsonFileStore(TEST_PATH)
    expect(s2.listHosts()).toHaveLength(1)
    expect(s2.listHosts()[0]!.mac).toBe('AA')
  })

  it('snapshots and retrieves previous hosts', () => {
    const s = new JsonFileStore(TEST_PATH)
    s.upsertHosts([{ mac: 'AA', ip: '10.0.0.1', hostname: null, vendor: null, online: true, latencyMs: null, deviceClass: 'unknown', services: [], firstSeen: 1, lastSeen: 1 }])
    s.snapshotHosts()
    s.upsertHosts([{ mac: 'BB', ip: '10.0.0.2', hostname: null, vendor: null, online: true, latencyMs: null, deviceClass: 'unknown', services: [], firstSeen: 2, lastSeen: 2 }])
    expect(s.getPreviousHosts()).toHaveLength(1)
    expect(s.getPreviousHosts()[0]!.mac).toBe('AA')
    expect(s.listHosts()).toHaveLength(2)
  })

  it('appends and lists threat events', () => {
    const s = new JsonFileStore(TEST_PATH)
    s.appendEvents([{ sev: 'High', source: '10.0.0.5', title: 'New device', desc: 'MAC BB', time: 'now', region: 'LAN' }])
    const events = s.listRecentEvents()
    expect(events).toHaveLength(1)
    expect(events[0]!.sev).toBe('High')
  })

  it('stores and retrieves the last gateway IP', () => {
    const s = new JsonFileStore(TEST_PATH)
    expect(s.getLastGatewayIp()).toBeNull()
    s.setLastGatewayIp('10.0.0.1')
    const s2 = new JsonFileStore(TEST_PATH)
    expect(s2.getLastGatewayIp()).toBe('10.0.0.1')
  })
})
