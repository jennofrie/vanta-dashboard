import { describe, it, expect } from 'vitest'
import { discover } from './discovery'

describe('discover', () => {
  it('merges arp + mdns + vendor + classification into DiscoveredHost[]', async () => {
    const result = await discover({
      gatewayIp: '10.0.0.1',
      now: () => 1000,
      arpScan: async () => [
        { ip: '10.0.0.1', mac: 'AA:00:00:00:00:01', name: null },
        { ip: '10.0.0.42', mac: 'BB:00:00:00:00:02', name: null }
      ],
      mdnsScan: async () => [
        { ip: '10.0.0.42', hostname: 'pixel.local', services: ['_googlecast._tcp'] }
      ],
      lookupVendor: (mac) => (mac.startsWith('AA') ? 'Ubiquiti' : 'Google')
    })
    const byIp = Object.fromEntries(result.map((h) => [h.ip, h]))
    expect(byIp['10.0.0.1']!.deviceClass).toBe('router') // isGateway
    expect(byIp['10.0.0.1']!.vendor).toBe('Ubiquiti')
    expect(byIp['10.0.0.42']!.hostname).toBe('pixel.local')
    expect(byIp['10.0.0.42']!.deviceClass).toBe('tv') // googlecast
    expect(byIp['10.0.0.42']!.online).toBe(true)
    expect(byIp['10.0.0.42']!.firstSeen).toBe(1000)
  })
})
