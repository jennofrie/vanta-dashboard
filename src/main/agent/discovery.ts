import type { DiscoveredHost } from '@shared/types'
import { classify } from './classify'

export interface ArpEntry { ip: string; mac: string; name: string | null }
export interface MdnsEntry { ip: string; hostname: string; services: string[] }

export interface DiscoverDeps {
  gatewayIp: string | null
  now: () => number
  arpScan: () => Promise<ArpEntry[]>
  mdnsScan: () => Promise<MdnsEntry[]>
  lookupVendor: (mac: string) => string | null
}

export async function discover(deps: DiscoverDeps): Promise<DiscoveredHost[]> {
  const [arp, mdns] = await Promise.all([deps.arpScan(), deps.mdnsScan()])
  const mdnsByIp = new Map(mdns.map((m) => [m.ip, m]))
  const ts = deps.now()

  return arp
    .filter((e) => e.mac && e.ip)
    .map((e) => {
      const m = mdnsByIp.get(e.ip)
      const vendor = deps.lookupVendor(e.mac)
      const hostname = m?.hostname ?? e.name ?? null
      const services = m?.services ?? []
      const isGateway = e.ip === deps.gatewayIp
      const c = classify({ isGateway, vendor, services, hostname })
      const host: DiscoveredHost = {
        ip: e.ip,
        mac: e.mac.toUpperCase(),
        hostname,
        vendor,
        online: true,
        latencyMs: null,
        deviceClass: c.deviceClass,
        services,
        firstSeen: ts,
        lastSeen: ts
      }
      return host
    })
}
