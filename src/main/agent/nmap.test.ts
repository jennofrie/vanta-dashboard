import { describe, it, expect } from 'vitest'
import { parseNmapServices } from './nmap'

const SAMPLE = `Nmap scan report for 10.0.0.5
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 7.4 (protocol 2.0)
80/tcp   open  http    nginx 1.10.3
443/tcp  open  https
Nmap done: 1 IP address (1 host up) scanned in 6.13 seconds`

describe('parseNmapServices', () => {
  it('extracts open ports with service and version', () => {
    const ports = parseNmapServices(SAMPLE)
    expect(ports.find((p) => p.port === 22)).toMatchObject({ service: 'ssh', version: 'OpenSSH 7.4 (protocol 2.0)' })
    expect(ports.find((p) => p.port === 80)).toMatchObject({ service: 'http', version: 'nginx 1.10.3' })
    expect(ports.find((p) => p.port === 443)?.service).toBe('https')
    expect(ports.find((p) => p.port === 443)?.version).toBeNull()
    expect(ports).toHaveLength(3)
  })
  it('returns empty for output with no open ports', () => {
    expect(parseNmapServices('Nmap done: 1 IP address')).toEqual([])
  })
})
