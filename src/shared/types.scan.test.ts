import { describe, it, expect } from 'vitest'
import type { OpenPort, HostScan, ScanResult } from '@shared/types'

describe('scan types', () => {
  it('models open ports, per-host scans, and an aggregate result', () => {
    const port: OpenPort = { port: 22, service: 'ssh', version: 'OpenSSH 9.0' }
    const host: HostScan = { mac: 'M', ip: '10.0.0.2', openPorts: [port], vulns: [], worstSeverity: null }
    const result: ScanResult = {
      scanning: false, lastScanAt: 1, nmapAvailable: false, vulns: [], hosts: [host]
    }
    expect(result.hosts[0]!.openPorts[0]!.port).toBe(22)
  })
})
