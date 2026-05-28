import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { DiscoveredHost, ThreatEvent } from '@shared/types'
import type { Store } from './store'

interface State {
  hosts: Record<string, DiscoveredHost>
  snapshot: DiscoveredHost[]
  events: ThreatEvent[]
  gatewayIp: string | null
}

const EMPTY: State = { hosts: {}, snapshot: [], events: [], gatewayIp: null }

/** JSON-backed persistent store. Reads on init, writes on every mutation.
 *  Replaces InMemoryStore for Phase 5. Will be succeeded by SqliteStore when
 *  better-sqlite3 gains Electron 42 support. */
export class JsonFileStore implements Store {
  private state: State

  constructor(private readonly filePath: string) {
    if (existsSync(filePath)) {
      try {
        this.state = JSON.parse(readFileSync(filePath, 'utf8')) as State
      } catch {
        this.state = { ...EMPTY, hosts: {}, snapshot: [], events: [] }
      }
    } else {
      this.state = { ...EMPTY, hosts: {}, snapshot: [], events: [] }
    }
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.state), 'utf8')
  }

  upsertHosts(hosts: DiscoveredHost[]): void {
    for (const h of hosts) {
      const prev = this.state.hosts[h.mac]
      this.state.hosts[h.mac] = prev ? { ...prev, ...h, firstSeen: prev.firstSeen } : h
    }
    this.save()
  }

  reconcileOnline(seenMacs: string[]): void {
    const seen = new Set(seenMacs)
    for (const mac of Object.keys(this.state.hosts)) {
      this.state.hosts[mac]!.online = seen.has(mac)
    }
    this.save()
  }

  listHosts(): DiscoveredHost[] { return Object.values(this.state.hosts) }

  snapshotHosts(): void {
    this.state.snapshot = [...Object.values(this.state.hosts)]
    this.save()
  }

  getPreviousHosts(): DiscoveredHost[] { return this.state.snapshot }

  appendEvents(events: ThreatEvent[]): void {
    this.state.events.push(...events)
    // keep last 500 events to avoid unbounded growth
    if (this.state.events.length > 500) this.state.events = this.state.events.slice(-500)
    this.save()
  }

  listRecentEvents(limit = 100): ThreatEvent[] {
    return this.state.events.slice(-limit)
  }

  getLastGatewayIp(): string | null { return this.state.gatewayIp }

  setLastGatewayIp(ip: string): void {
    this.state.gatewayIp = ip
    this.save()
  }
}
