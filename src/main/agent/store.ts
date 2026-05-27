import type { DiscoveredHost } from '@shared/types'

export interface Store {
  upsertHosts(hosts: DiscoveredHost[]): void
  reconcileOnline(seenMacs: string[]): void
  listHosts(): DiscoveredHost[]
}

/** Phase-2 store. Same interface a future SQLite store will implement. */
export class InMemoryStore implements Store {
  private byMac = new Map<string, DiscoveredHost>()

  upsertHosts(hosts: DiscoveredHost[]): void {
    for (const h of hosts) {
      const prev = this.byMac.get(h.mac)
      this.byMac.set(h.mac, prev ? { ...prev, ...h, firstSeen: prev.firstSeen } : h)
    }
  }

  reconcileOnline(seenMacs: string[]): void {
    const seen = new Set(seenMacs)
    for (const [mac, h] of this.byMac) {
      this.byMac.set(mac, { ...h, online: seen.has(mac) })
    }
  }

  listHosts(): DiscoveredHost[] {
    return [...this.byMac.values()]
  }
}
