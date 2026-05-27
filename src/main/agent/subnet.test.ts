import { describe, it, expect } from 'vitest'
import { deriveSubnet, enumerateHosts } from './subnet'

describe('subnet', () => {
  it('derives CIDR from ip + netmask', () => {
    expect(deriveSubnet('10.0.0.42', '255.255.255.0')).toBe('10.0.0.0/24')
    expect(deriveSubnet('192.168.1.9', '255.255.255.0')).toBe('192.168.1.0/24')
  })
  it('enumerates usable hosts for a /24 (excludes network + broadcast)', () => {
    const hosts = enumerateHosts('10.0.0.0/24')
    expect(hosts).toHaveLength(254)
    expect(hosts[0]).toBe('10.0.0.1')
    expect(hosts[253]).toBe('10.0.0.254')
  })
  it('refuses non-/24 ranges (out of scope, keeps sweeps bounded)', () => {
    expect(() => enumerateHosts('10.0.0.0/16')).toThrow()
  })
})
