import { describe, it, expect } from 'vitest'
import { runScan } from './scan'
import type { Device } from '@shared/types'

const dev = (over: Partial<Device>): Device => ({
  name: 'n', type: 'Unknown', ico: 'globe', mac: 'M', ip: '10.0.0.2',
  online: true, signal: 100, role: 'Endpoint', ...over
})

describe('runScan', () => {
  it('produces heuristic findings; open ports lack versions without nmap', async () => {
    const result = await runScan([dev({ mac: 'A', ip: '10.0.0.2' })], {
      now: () => 1000,
      nmapAvailable: false,
      portScan: async () => [23, 80],
      nmapScan: async () => { throw new Error('nmap must not be called when unavailable') }
    })
    expect(result.nmapAvailable).toBe(false)
    expect(result.hosts[0]!.openPorts.map((p) => p.port)).toEqual([23, 80])
    expect(result.hosts[0]!.openPorts[0]!.version).toBeNull()
    expect(result.hosts[0]!.worstSeverity).toBe('High') // telnet 23
    expect(result.vulns.some((v) => v.id === 'EXPOSURE-23')).toBe(true)
    expect(result.lastScanAt).toBe(1000)
  })

  it('enriches open ports with nmap service/version; findings stay heuristic', async () => {
    const result = await runScan([dev({ mac: 'A', ip: '10.0.0.2', name: 'box' })], {
      now: () => 5,
      nmapAvailable: true,
      portScan: async () => [22],
      nmapScan: async () => [{ port: 22, service: 'ssh', version: 'OpenSSH 7.4' }]
    })
    expect(result.nmapAvailable).toBe(true)
    expect(result.hosts[0]!.openPorts[0]).toMatchObject({ port: 22, service: 'ssh', version: 'OpenSSH 7.4' })
    expect(result.vulns.map((v) => v.id)).toEqual(['EXPOSURE-22']) // heuristic, not a CVE
    expect(result.hosts[0]!.worstSeverity).toBe('Low')
  })

  it('only scans online hosts', async () => {
    const result = await runScan([dev({ mac: 'A', online: false })], {
      now: () => 1, nmapAvailable: false,
      portScan: async () => { throw new Error('offline host must not be scanned') },
      nmapScan: async () => []
    })
    expect(result.hosts).toHaveLength(0)
  })
})
