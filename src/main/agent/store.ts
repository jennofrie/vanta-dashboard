import type { DiscoveredHost, ThreatEvent } from '@shared/types'

export interface Store {
  upsertHosts(hosts: DiscoveredHost[]): void
  reconcileOnline(seenMacs: string[]): void
  listHosts(): DiscoveredHost[]
  snapshotHosts(): void
  getPreviousHosts(): DiscoveredHost[]
  appendEvents(events: ThreatEvent[]): void
  listRecentEvents(limit?: number): ThreatEvent[]
  getLastGatewayIp(): string | null
  setLastGatewayIp(ip: string): void
}

/** Phase-2 store. Same interface a future SQLite store will implement. */
export class InMemoryStore implements Store {
  private byMac = new Map<string, DiscoveredHost>()
  private prevHosts: DiscoveredHost[] = []
  private _events: ThreatEvent[] = []
  private _gatewayIp: string | null = null

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

  snapshotHosts(): void { this.prevHosts = [...this.byMac.values()] }
  getPreviousHosts(): DiscoveredHost[] { return this.prevHosts }
  appendEvents(events: ThreatEvent[]): void { this._events.push(...events) }
  listRecentEvents(limit = 100): ThreatEvent[] { return this._events.slice(-limit) }
  getLastGatewayIp(): string | null { return this._gatewayIp }
  setLastGatewayIp(ip: string): void { this._gatewayIp = ip }
}
