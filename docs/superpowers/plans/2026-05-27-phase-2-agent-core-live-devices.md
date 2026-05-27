# Phase 2 — Agent Core & Live Devices — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Devices tab's static data with the user's real LAN — discover live hosts (ARP + ping sweep + mDNS), classify them, persist them behind a swappable store, refresh on a timer, and stream them to the renderer over typed IPC.

**Architecture:** A privileged agent in the Electron main process. Small single-purpose modules under `src/main/agent/` (each unit takes injected dependencies so it is testable without a live network). A `scheduler` runs a cheap discovery sweep on an interval; results are diffed/merged into a `Store` and pushed to the renderer via IPC; the Devices view consumes them through `window.vanta`.

**Tech Stack:** Electron + electron-vite (existing), TypeScript, `systeminformation` (gateway/interfaces), `local-devices` (ARP scan), `bonjour-service` (mDNS), `oui` (offline MAC→vendor), Vitest.

---

## Scope of this phase

In: real device discovery on the local subnet, vendor + type classification, an in-memory `Store` behind an interface, a tiered `scheduler` (cheap sweep), typed IPC (`devices.list` + a `vanta:devices` push event), and the **Devices** tab wired to live data with loading/empty states.

Out (later phases): port scanning, vulnerabilities, the network topology view, the threat rule engine, the dashboard wiring, durable SQLite persistence, and privilege escalation. No `nmap`. No elevation — discovery here is unprivileged (system `ping` + ARP table read + mDNS).

## Key design decisions

1. **Persistence = in-memory behind an interface.** Define `Store` (interface) + `InMemoryStore`. SQLite (`better-sqlite3`) is deferred to the phase that needs durable history (Threats), and will implement the same `Store` interface so no consumer changes. Rationale: native modules need Electron rebuilds (friction with the beta toolchain) and Phase 2 needs no history yet (YAGNI).
2. **Dependency injection for testability.** Discovery and the scheduler receive their I/O dependencies (an ARP-scan fn, an mDNS browser, a clock/timer, the store) as parameters. Unit tests inject fixtures/fakes — **no test touches the real network or real timers.**
3. **Unprivileged discovery.** `local-devices` (ARP table, populated by its ping sweep) + `bonjour-service` (mDNS). No raw sockets, no sudo. Matches the spec's least-privilege posture.
4. **Honest field substitutions (from the spec):** `Device.signal` is a **reachability score** (online → 100, offline → 0 for this phase; refined to latency-based later), since per-host Wi-Fi RSSI is unobtainable. `Device.role`/`type`/`ico` come from classification mapped onto the **existing icon set**. The Devices stat card "awaiting pair" → count of **unclassified** hosts.

## Target file structure (this phase)

```
src/
├─ shared/
│  └─ types.ts                 # MODIFY: add DeviceClass, DiscoveredHost; extend VantaBridge
├─ main/
│  ├─ index.ts                 # MODIFY: bootstrap agent, register IPC, push events
│  └─ agent/
│     ├─ subnet.ts             # CREATE: derive active subnet from interface info
│     ├─ subnet.test.ts
│     ├─ vendor.ts             # CREATE: MAC → manufacturer (oui)
│     ├─ vendor.test.ts
│     ├─ classify.ts           # CREATE: host → {type, role, ico} (pure)
│     ├─ classify.test.ts
│     ├─ store.ts              # CREATE: Store interface + InMemoryStore
│     ├─ store.test.ts
│     ├─ discovery.ts          # CREATE: orchestrate arp + mdns → DiscoveredHost[]
│     ├─ discovery.test.ts
│     ├─ scheduler.ts          # CREATE: tiered sweep loop (injected deps)
│     ├─ scheduler.test.ts
│     └─ ipc.ts                # CREATE: register devices channels + event push
├─ preload/
│  └─ index.ts                 # MODIFY: expose window.vanta.devices.*
└─ renderer/src/
   ├─ vanta.d.ts               # MODIFY: extend window typing (auto via VantaBridge)
   ├─ hooks/useDevices.ts      # CREATE: subscribe to live devices
   └─ views/DevicesView.tsx    # MODIFY: consume live data instead of static DEVICES
```

---

## Task 1: Install agent dependencies

**Files:** Modify `package.json`

- [ ] **Step 1: Install**
```bash
cd /Users/sharan/Desktop/Github/vanta-dashboard
npm install systeminformation local-devices bonjour-service oui
npm install -D @types/oui
```
(If `@types/oui` does not exist on the registry, skip it and add a local ambient declaration in Task 2 instead — report which happened.)

- [ ] **Step 2: Verify install + that the project still builds**
Run: `npm run build`
Expected: build succeeds (main/preload/renderer) as before.

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: add discovery dependencies (systeminformation, local-devices, bonjour-service, oui)"
```

---

## Task 2: Extend shared types

**Files:** Modify `src/shared/types.ts`; Test `src/shared/types.devices.test.ts`

- [ ] **Step 1: Write the failing test** — `src/shared/types.devices.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { DiscoveredHost, Device } from '@shared/types'
import { DEVICE_CLASSES } from '@shared/types'

describe('device types', () => {
  it('exposes device classes', () => {
    expect(DEVICE_CLASSES).toContain('router')
    expect(DEVICE_CLASSES).toContain('unknown')
  })
  it('DiscoveredHost carries identity + classification fields', () => {
    const h: DiscoveredHost = {
      ip: '10.0.0.5', mac: 'AA:BB:CC:DD:EE:FF', hostname: 'box.local',
      vendor: 'Acme', online: true, latencyMs: 7, deviceClass: 'router',
      services: ['_http._tcp'], firstSeen: 1, lastSeen: 2
    }
    const d: Device = {
      name: 'box', type: 'Router', ico: 'router', mac: h.mac, ip: h.ip,
      online: true, signal: 100, role: 'Gateway'
    }
    expect(d.ip).toBe(h.ip)
  })
})
```

- [ ] **Step 2: Run to verify it fails**
Run: `npx vitest run src/shared/types.devices.test.ts`
Expected: FAIL — `DEVICE_CLASSES`/`DiscoveredHost` not exported.

- [ ] **Step 3: Append to `src/shared/types.ts`** (do not modify existing exports):
```ts
export const DEVICE_CLASSES = [
  'router', 'server', 'phone', 'tv', 'camera', 'speaker', 'watch', 'laptop',
  'printer', 'iot', 'unknown'
] as const
export type DeviceClass = (typeof DEVICE_CLASSES)[number]

// Raw host as discovered/classified by the agent (superset of the UI Device).
export interface DiscoveredHost {
  ip: string
  mac: string
  hostname: string | null
  vendor: string | null
  online: boolean
  latencyMs: number | null
  deviceClass: DeviceClass
  services: string[]
  firstSeen: number
  lastSeen: number
}
```
Then extend `VantaBridge` (replace the existing interface body, keeping `ping`):
```ts
export interface VantaBridge {
  ping(): Promise<'pong'>
  devices: {
    list(): Promise<Device[]>
    /** Subscribe to live device updates. Returns an unsubscribe fn. */
    subscribe(cb: (devices: Device[]) => void): () => void
  }
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npx vitest run src/shared/types.devices.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**
```bash
git add src/shared/types.ts src/shared/types.devices.test.ts
git commit -m "feat: add DiscoveredHost/DeviceClass types and devices IPC contract"
```

---

## Task 3: Subnet derivation

**Files:** Create `src/main/agent/subnet.ts`, `src/main/agent/subnet.test.ts`

- [ ] **Step 1: Write the failing test** — `subnet.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**
Run: `npx vitest run src/main/agent/subnet.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `subnet.ts`**
```ts
/** Compute the network CIDR (e.g. "10.0.0.0/24") from an IPv4 + dotted netmask. */
export function deriveSubnet(ip: string, netmask: string): string {
  const ipParts = ip.split('.').map(Number)
  const maskParts = netmask.split('.').map(Number)
  if (ipParts.length !== 4 || maskParts.length !== 4) {
    throw new Error(`invalid ipv4/netmask: ${ip} / ${netmask}`)
  }
  const net = ipParts.map((o, i) => o & maskParts[i]!).join('.')
  const prefix = maskParts
    .map((o) => o.toString(2).padStart(8, '0'))
    .join('')
    .split('')
    .filter((b) => b === '1').length
  return `${net}/${prefix}`
}

/** Enumerate usable host IPs for a /24. Bounded by design: only /24 is supported. */
export function enumerateHosts(cidr: string): string[] {
  const [base, prefixStr] = cidr.split('/')
  if (prefixStr !== '24') {
    throw new Error(`only /24 subnets are supported for scanning, got /${prefixStr}`)
  }
  const octets = base!.split('.').map(Number)
  const out: string[] = []
  for (let i = 1; i <= 254; i++) {
    out.push(`${octets[0]}.${octets[1]}.${octets[2]}.${i}`)
  }
  return out
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npx vitest run src/main/agent/subnet.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Type-check node project**
Run: `npx tsc -p tsconfig.node.json --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**
```bash
git add src/main/agent/subnet.ts src/main/agent/subnet.test.ts
git commit -m "feat: add subnet derivation and bounded /24 host enumeration"
```

---

## Task 4: Vendor lookup

**Files:** Create `src/main/agent/vendor.ts`, `src/main/agent/vendor.test.ts`. If `@types/oui` was unavailable in Task 1, also create `src/main/agent/oui.d.ts` with `declare module 'oui' { const lookup: (mac: string) => string | null; export default lookup }`.

- [ ] **Step 1: Write the failing test** — `vendor.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { makeVendorLookup } from './vendor'

describe('vendor lookup', () => {
  it('returns the org string for a known OUI', () => {
    const lookup = makeVendorLookup((mac) => (mac.startsWith('FC:FB:FB') ? 'Acme Corp' : null))
    expect(lookup('FC:FB:FB:01:02:03')).toBe('Acme Corp')
  })
  it('returns null for unknown and normalizes separators', () => {
    const raw = vi.fn().mockReturnValue(null)
    const lookup = makeVendorLookup(raw)
    expect(lookup('aa-bb-cc-dd-ee-ff')).toBeNull()
    expect(raw).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF')
  })
})
```

- [ ] **Step 2: Run to verify it fails**
Run: `npx vitest run src/main/agent/vendor.test.ts` → FAIL (module not found).

- [ ] **Step 3: Create `vendor.ts`** (the raw lookup is injected so tests don't load the real DB):
```ts
import ouiLookup from 'oui'

export type RawOuiLookup = (mac: string) => string | null

function normalizeMac(mac: string): string {
  return mac.trim().toUpperCase().replace(/-/g, ':')
}

/** Wrap a raw OUI lookup with MAC normalization. */
export function makeVendorLookup(raw: RawOuiLookup) {
  return (mac: string): string | null => {
    const org = raw(normalizeMac(mac))
    return org && org.length > 0 ? org : null
  }
}

/** Production lookup backed by the bundled offline OUI database. */
export const lookupVendor = makeVendorLookup((mac) => {
  const result = ouiLookup(mac)
  if (!result) return null
  // `oui` returns a multi-line record; the first line is the org name.
  return result.split('\n')[0]!.trim()
})
```

- [ ] **Step 4: Run to verify it passes**
Run: `npx vitest run src/main/agent/vendor.test.ts` → PASS (2).

- [ ] **Step 5: Commit**
```bash
git add src/main/agent/vendor.ts src/main/agent/vendor.test.ts src/main/agent/oui.d.ts 2>/dev/null; git add -A
git commit -m "feat: add MAC->vendor lookup with normalization (offline oui)"
```

---

## Task 5: Device classifier

**Files:** Create `src/main/agent/classify.ts`, `src/main/agent/classify.test.ts`

- [ ] **Step 1: Write the failing test** — `classify.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { classify } from './classify'

describe('classify', () => {
  it('classifies the gateway as a router', () => {
    expect(classify({ isGateway: true, vendor: null, services: [], hostname: null }).deviceClass).toBe('router')
  })
  it('uses mDNS service types', () => {
    expect(classify({ isGateway: false, vendor: null, services: ['_airplay._tcp'], hostname: null }).deviceClass).toBe('tv')
    expect(classify({ isGateway: false, vendor: null, services: ['_ipp._tcp'], hostname: null }).deviceClass).toBe('printer')
  })
  it('falls back to vendor hints, then unknown', () => {
    expect(classify({ isGateway: false, vendor: 'Apple, Inc.', services: [], hostname: 'iphone.local' }).deviceClass).toBe('phone')
    expect(classify({ isGateway: false, vendor: null, services: [], hostname: null }).deviceClass).toBe('unknown')
  })
  it('maps each class to an existing icon name', () => {
    expect(classify({ isGateway: true, vendor: null, services: [], hostname: null }).ico).toBe('router')
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `classify.ts`**
```ts
import type { DeviceClass } from '@shared/types'

export interface ClassifyInput {
  isGateway: boolean
  vendor: string | null
  services: string[]
  hostname: string | null
}

export interface Classification {
  deviceClass: DeviceClass
  type: string
  role: string
  ico: string
}

// DeviceClass -> existing Icon name (see src/renderer/src/components/Icon.tsx).
const ICON: Record<DeviceClass, string> = {
  router: 'router', server: 'server', phone: 'phone', tv: 'tv', camera: 'camera',
  speaker: 'speaker', watch: 'watch', laptop: 'cpu', printer: 'server',
  iot: 'cpu', unknown: 'globe'
}
const TYPE_LABEL: Record<DeviceClass, string> = {
  router: 'Router', server: 'Server', phone: 'Phone', tv: 'Display', camera: 'Camera',
  speaker: 'Speaker', watch: 'Wearable', laptop: 'Computer', printer: 'Printer',
  iot: 'IoT', unknown: 'Unknown'
}
const ROLE: Record<DeviceClass, string> = {
  router: 'Gateway', server: 'Server', phone: 'Endpoint', tv: 'Endpoint',
  camera: 'Sensor', speaker: 'IoT', watch: 'IoT', laptop: 'Endpoint',
  printer: 'Peripheral', iot: 'IoT', unknown: 'Endpoint'
}

const SERVICE_CLASS: Array<[RegExp, DeviceClass]> = [
  [/_airplay|_raop|_googlecast/i, 'tv'],
  [/_ipp|_printer|_pdl-datastream/i, 'printer'],
  [/_spotify-connect|_sonos/i, 'speaker'],
  [/_ssh|_sftp-ssh|_smb|_afpovertcp|_nfs/i, 'server'],
  [/_homekit|_hap|_miio/i, 'iot']
]
const VENDOR_CLASS: Array<[RegExp, DeviceClass]> = [
  [/apple/i, 'phone'],
  [/google|nest/i, 'iot'],
  [/amazon/i, 'speaker'],
  [/ubiquiti|netgear|tp-link|asus|cisco|d-link/i, 'router'],
  [/hp|canon|epson|brother/i, 'printer'],
  [/raspberry/i, 'server']
]

export function classify(input: ClassifyInput): Classification {
  const cls = classifyClass(input)
  return { deviceClass: cls, type: TYPE_LABEL[cls], role: ROLE[cls], ico: ICON[cls] }
}

function classifyClass(input: ClassifyInput): DeviceClass {
  if (input.isGateway) return 'router'
  for (const svc of input.services) {
    for (const [re, cls] of SERVICE_CLASS) if (re.test(svc)) return cls
  }
  if (input.vendor) {
    for (const [re, cls] of VENDOR_CLASS) if (re.test(input.vendor)) return cls
  }
  if (input.hostname && /iphone|ipad|android|pixel|phone/i.test(input.hostname)) return 'phone'
  return 'unknown'
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (4).

- [ ] **Step 5: Commit**
```bash
git add src/main/agent/classify.ts src/main/agent/classify.test.ts
git commit -m "feat: add device classifier (service/vendor/hostname -> class + icon)"
```

---

## Task 6: Store interface + in-memory implementation

**Files:** Create `src/main/agent/store.ts`, `src/main/agent/store.test.ts`

- [ ] **Step 1: Write the failing test** — `store.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { InMemoryStore } from './store'
import type { DiscoveredHost } from '@shared/types'

const host = (ip: string, over: Partial<DiscoveredHost> = {}): DiscoveredHost => ({
  ip, mac: 'AA:BB:CC:00:00:01', hostname: null, vendor: null, online: true,
  latencyMs: 5, deviceClass: 'unknown', services: [], firstSeen: 1, lastSeen: 1, ...over
})

describe('InMemoryStore', () => {
  it('upserts by mac and lists hosts', () => {
    const s = new InMemoryStore()
    s.upsertHosts([host('10.0.0.2')])
    s.upsertHosts([host('10.0.0.3', { ip: '10.0.0.3', mac: 'AA:BB:CC:00:00:01', lastSeen: 9 })])
    // same mac → one record, latest ip/lastSeen win, firstSeen preserved
    expect(s.listHosts()).toHaveLength(1)
    expect(s.listHosts()[0]!.ip).toBe('10.0.0.3')
    expect(s.listHosts()[0]!.firstSeen).toBe(1)
    expect(s.listHosts()[0]!.lastSeen).toBe(9)
  })
  it('marks hosts not in the latest sweep as offline', () => {
    const s = new InMemoryStore()
    s.upsertHosts([host('10.0.0.2', { mac: 'M1' }), host('10.0.0.3', { mac: 'M2' })])
    s.reconcileOnline(['M1'])
    const byMac = Object.fromEntries(s.listHosts().map((h) => [h.mac, h]))
    expect(byMac['M1']!.online).toBe(true)
    expect(byMac['M2']!.online).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `store.ts`**
```ts
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
```

- [ ] **Step 4: Run to verify it passes** → PASS (2).

- [ ] **Step 5: Commit**
```bash
git add src/main/agent/store.ts src/main/agent/store.test.ts
git commit -m "feat: add Store interface and InMemoryStore (swappable for SQLite later)"
```

---

## Task 7: Discovery orchestrator

**Files:** Create `src/main/agent/discovery.ts`, `src/main/agent/discovery.test.ts`

The orchestrator takes injected probes so it is testable with fixtures. Production wiring (real `local-devices`/`bonjour-service`/`systeminformation`) is assembled in Task 9, not here.

- [ ] **Step 1: Write the failing test** — `discovery.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `discovery.ts`**
```ts
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
```

- [ ] **Step 4: Run to verify it passes** → PASS (1).

- [ ] **Step 5: Commit**
```bash
git add src/main/agent/discovery.ts src/main/agent/discovery.test.ts
git commit -m "feat: add discovery orchestrator (arp + mdns + vendor + classify), DI for tests"
```

---

## Task 8: Scheduler

**Files:** Create `src/main/agent/scheduler.ts`, `src/main/agent/scheduler.test.ts`

- [ ] **Step 1: Write the failing test** — `scheduler.test.ts` (uses vitest fake timers, no real time):
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Scheduler } from './scheduler'

describe('Scheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs immediately then on the interval, emitting each result', async () => {
    const results: number[][] = []
    let n = 0
    const sweep = vi.fn(async () => [++n])
    const s = new Scheduler({ intervalMs: 1000, sweep, onResult: (r: number[]) => results.push(r) })
    s.start()
    await vi.advanceTimersByTimeAsync(0)     // immediate run
    expect(results).toEqual([[1]])
    await vi.advanceTimersByTimeAsync(1000)  // next tick
    expect(results).toEqual([[1], [2]])
    s.stop()
    await vi.advanceTimersByTimeAsync(2000)  // no more after stop
    expect(results).toEqual([[1], [2]])
  })

  it('does not overlap runs if a sweep is slow', async () => {
    let active = 0
    let maxActive = 0
    const sweep = vi.fn(async () => {
      active++; maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 500)); active--
      return []
    })
    const s = new Scheduler({ intervalMs: 100, sweep, onResult: () => {} })
    s.start()
    await vi.advanceTimersByTimeAsync(2000)
    s.stop()
    expect(maxActive).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `scheduler.ts`**
```ts
export interface SchedulerOptions<T> {
  intervalMs: number
  sweep: () => Promise<T>
  onResult: (result: T) => void
}

/** Runs `sweep` immediately, then every intervalMs. Never overlaps runs. */
export class Scheduler<T> {
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private stopped = true

  constructor(private opts: SchedulerOptions<T>) {}

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    void this.tick()
  }

  stop(): void {
    this.stopped = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private async tick(): Promise<void> {
    if (this.stopped || this.running) return
    this.running = true
    try {
      const result = await this.opts.sweep()
      if (!this.stopped) this.opts.onResult(result)
    } catch {
      // a failed sweep must not kill the loop; next tick retries
    } finally {
      this.running = false
      if (!this.stopped) {
        this.timer = setTimeout(() => void this.tick(), this.opts.intervalMs)
      }
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (2).

- [ ] **Step 5: Commit**
```bash
git add src/main/agent/scheduler.ts src/main/agent/scheduler.test.ts
git commit -m "feat: add non-overlapping interval scheduler with immediate first run"
```

---

## Task 9: Production wiring — probes, agent bootstrap, and IPC

**Files:** Create `src/main/agent/ipc.ts`; Modify `src/main/index.ts`. Create `src/main/agent/probes.ts` (real I/O adapters; thin, not unit-tested — covered by the manual run in Task 11).

- [ ] **Step 1: Create `src/main/agent/probes.ts`** (real adapters around the libraries):
```ts
import si from 'systeminformation'
import find from 'local-devices'
import { Bonjour } from 'bonjour-service'
import type { ArpEntry, MdnsEntry } from './discovery'

export async function getGatewayIp(): Promise<string | null> {
  try {
    return (await si.networkGatewayDefault()) || null
  } catch {
    return null
  }
}

export async function arpScan(): Promise<ArpEntry[]> {
  const devices = await find()
  return devices.map((d) => ({ ip: d.ip, mac: d.mac, name: d.name && d.name !== '?' ? d.name : null }))
}

/** Browse common mDNS service types for a short window, collect per-IP info. */
export async function mdnsScan(windowMs = 2500): Promise<MdnsEntry[]> {
  const bonjour = new Bonjour()
  const byIp = new Map<string, MdnsEntry>()
  const types = ['http', 'airplay', 'googlecast', 'ipp', 'printer', 'spotify-connect', 'raop', 'ssh', 'homekit', 'sonos']
  const browsers = types.map((type) =>
    bonjour.find({ type }, (svc) => {
      for (const ip of svc.addresses ?? []) {
        if (ip.includes(':')) continue // skip IPv6
        const cur = byIp.get(ip) ?? { ip, hostname: svc.host ?? '', services: [] }
        const svcType = `_${type}._tcp`
        if (!cur.services.includes(svcType)) cur.services.push(svcType)
        if (!cur.hostname && svc.host) cur.hostname = svc.host
        byIp.set(ip, cur)
      }
    })
  )
  await new Promise((r) => setTimeout(r, windowMs))
  browsers.forEach((b) => b.stop())
  bonjour.destroy()
  return [...byIp.values()].map((m) => ({ ...m, hostname: m.hostname.replace(/\.$/, '') }))
}
```

- [ ] **Step 2: Create `src/main/agent/ipc.ts`** — assembles the agent and registers channels:
```ts
import { BrowserWindow, ipcMain } from 'electron'
import type { Device } from '@shared/types'
import { InMemoryStore } from './store'
import { Scheduler } from './scheduler'
import { discover } from './discovery'
import { lookupVendor } from './vendor'
import { getGatewayIp, arpScan, mdnsScan } from './probes'

function toDevice(h: import('@shared/types').DiscoveredHost): Device {
  const lastOctet = h.ip.split('.').pop() ?? '0'
  return {
    name: h.hostname || (h.vendor ? `${h.vendor} ·${lastOctet}` : `Host ·${lastOctet}`),
    type: h.deviceClass === 'unknown' ? 'Unknown' : h.deviceClass[0]!.toUpperCase() + h.deviceClass.slice(1),
    ico: ICO[h.deviceClass] ?? 'globe',
    mac: h.mac,
    ip: h.ip,
    online: h.online,
    signal: h.online ? 100 : 0, // reachability score (per spec substitution)
    role: ROLE[h.deviceClass] ?? 'Endpoint'
  }
}
const ICO: Record<string, string> = {
  router: 'router', server: 'server', phone: 'phone', tv: 'tv', camera: 'camera',
  speaker: 'speaker', watch: 'watch', laptop: 'cpu', printer: 'server', iot: 'cpu', unknown: 'globe'
}
const ROLE: Record<string, string> = {
  router: 'Gateway', server: 'Server', phone: 'Endpoint', tv: 'Endpoint', camera: 'Sensor',
  speaker: 'IoT', watch: 'IoT', laptop: 'Endpoint', printer: 'Peripheral', iot: 'IoT', unknown: 'Endpoint'
}

export function startAgent(): { stop: () => void } {
  const store = new InMemoryStore()

  const sweep = async () => {
    const gatewayIp = await getGatewayIp()
    const hosts = await discover({ gatewayIp, now: Date.now, arpScan, mdnsScan, lookupVendor })
    store.upsertHosts(hosts)
    store.reconcileOnline(hosts.map((h) => h.mac))
    return store.listHosts().map(toDevice)
  }

  const scheduler = new Scheduler<Device[]>({
    intervalMs: 45_000,
    sweep,
    onResult: (devices) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('vanta:devices', devices)
      }
    }
  })

  ipcMain.handle('vanta:devices:list', async () => store.listHosts().map(toDevice))
  scheduler.start()
  return { stop: () => scheduler.stop() }
}
```

- [ ] **Step 3: Modify `src/main/index.ts`** — start the agent after the window is ready. Add `import { startAgent } from './agent/ipc'`, and inside `app.whenReady().then(() => { ... })` after `createWindow()` add `startAgent()`. Keep the existing `vanta:ping` handler.

- [ ] **Step 4: Type-check node**
Run: `npx tsc -p tsconfig.node.json --noEmit`
Expected: exit 0. (Fix only type issues; do not change behavior.)

- [ ] **Step 5: Build**
Run: `npm run build` → succeeds.

- [ ] **Step 6: Commit**
```bash
git add src/main/agent/probes.ts src/main/agent/ipc.ts src/main/index.ts
git commit -m "feat: wire discovery agent + scheduler and register devices IPC channels"
```

---

## Task 10: Preload bridge + Devices view wiring

**Files:** Modify `src/preload/index.ts`; Create `src/renderer/src/hooks/useDevices.ts` + `useDevices.test.tsx`; Modify `src/renderer/src/views/DevicesView.tsx`.

- [ ] **Step 1: Extend `src/preload/index.ts`**
```ts
import { contextBridge, ipcRenderer } from 'electron'
import type { VantaBridge, Device } from '@shared/types'

const api: VantaBridge = {
  ping: () => ipcRenderer.invoke('vanta:ping'),
  devices: {
    list: () => ipcRenderer.invoke('vanta:devices:list'),
    subscribe: (cb: (devices: Device[]) => void) => {
      const listener = (_e: unknown, devices: Device[]) => cb(devices)
      ipcRenderer.on('vanta:devices', listener)
      return () => ipcRenderer.removeListener('vanta:devices', listener)
    }
  }
}

contextBridge.exposeInMainWorld('vanta', api)
```

- [ ] **Step 2: Write the failing hook test** — `src/renderer/src/hooks/useDevices.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDevices } from './useDevices'
import type { Device } from '@shared/types'

const d = (ip: string): Device => ({
  name: ip, type: 'Unknown', ico: 'globe', mac: ip, ip, online: true, signal: 100, role: 'Endpoint'
})

describe('useDevices', () => {
  beforeEach(() => {
    let cb: ((x: Device[]) => void) | null = null
    ;(window as unknown as { vanta: unknown }).vanta = {
      ping: vi.fn(),
      devices: {
        list: vi.fn().mockResolvedValue([d('10.0.0.1')]),
        subscribe: (fn: (x: Device[]) => void) => { cb = fn; return () => { cb = null } }
      }
    }
    ;(window as unknown as { __emit: (x: Device[]) => void }).__emit = (x) => cb?.(x)
  })

  it('loads the initial list then applies live updates', async () => {
    const { result } = renderHook(() => useDevices())
    await waitFor(() => expect(result.current.devices).toHaveLength(1))
    act(() => (window as unknown as { __emit: (x: Device[]) => void }).__emit([d('10.0.0.1'), d('10.0.0.2')]))
    expect(result.current.devices).toHaveLength(2)
  })
})
```

- [ ] **Step 3: Run to verify it fails** → module not found.

- [ ] **Step 4: Create `src/renderer/src/hooks/useDevices.ts`**
```ts
import { useEffect, useState } from 'react'
import type { Device } from '@shared/types'

export function useDevices(): { devices: Device[]; loading: boolean } {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    window.vanta.devices.list().then((list) => {
      if (mounted) {
        setDevices(list)
        setLoading(false)
      }
    })
    const unsubscribe = window.vanta.devices.subscribe((list) => {
      if (mounted) setDevices(list)
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return { devices, loading }
}
```

- [ ] **Step 5: Run to verify it passes** → PASS (1).

- [ ] **Step 6: Modify `DevicesView.tsx`** — replace the static source with the live hook. Change `const [list, setList] = useState(DEVICES)` to `const { devices: list, loading } = useDevices()` and remove the `import { DEVICES } from '../data'`; add `import { useDevices } from '../hooks/useDevices'`. The `toggleOnline` handler operated on local state; since data is now live, replace the per-card Disconnect/Reconnect button's `onClick={() => toggleOnline(i)}` with a no-op placeholder `onClick={() => {}}` (real connect/disconnect is a later phase) and delete the now-unused `toggleOnline`/`setList`. Above the device grid, when `loading` is true render a single `<div className="device-meta">Scanning your network…</div>`, and when not loading and `list.length === 0` render `<div className="device-meta">No devices found yet.</div>`. Keep ALL other markup/classes identical. Keep the "Connect a device" tile.
- Update the stat cards to compute from the live `list` (total / online / offline). For the 4th card "Awaiting pair", change its number to the count of devices with `type === 'Unknown'` and keep its label text.

- [ ] **Step 7: Update `views.test.tsx`** — `DevicesView` now needs `window.vanta`. Add a `beforeEach` in that file that sets `window.vanta` to a stub: `{ ping: vi.fn(), devices: { list: () => Promise.resolve([]), subscribe: () => () => {} } }`, and change the Devices test to assert the empty/heading state: `expect(screen.getByText('Connected Devices')).toBeInTheDocument()` still holds (the card title renders regardless). Remove the `Aurora Hub` assertion (that was static data). Run `npx vitest run src/renderer/src/views/views.test.tsx` → PASS.

- [ ] **Step 8: Type-check both projects + full test suite**
```bash
npx tsc -p tsconfig.node.json --noEmit && npx tsc -p tsconfig.web.json --noEmit && npm test
```
Expected: both tsc exit 0; all tests pass.

- [ ] **Step 9: Commit**
```bash
git add src/preload/index.ts src/renderer/src/hooks src/renderer/src/views/DevicesView.tsx src/renderer/src/views/views.test.tsx
git commit -m "feat: wire Devices tab to live discovery over IPC"
```

---

## Task 11: Verification (automated + manual run)

- [ ] **Step 1: Full automated gate**
```bash
npm test && npm run typecheck && npm run build
```
Expected: all tests pass; both TS projects clean; build succeeds.

- [ ] **Step 2: Manual run (requires a real LAN; controller hands this to the user)**
Run: `npm run dev`. On the Devices tab, confirm real devices from your network appear within ~one sweep (≤45s), with plausible names/types/vendors, online/offline reflecting reality, and the stat cards counting correctly. The gateway should classify as a Router. Other tabs still render (they remain on static data until their phases).

- [ ] **Step 3: Commit any fixes from the manual run**
```bash
git add -A && git commit -m "fix: address issues found during Phase 2 manual verification"
```
(Skip if nothing needed.)

---

## Self-Review

- **Spec coverage (Phase 2):** discovery (Tasks 7, 9) ✓; vendor (Task 4) ✓; classification → existing icons (Task 5) ✓; store behind interface (Task 6, SQLite explicitly deferred) ✓; tiered scheduler (Task 8) ✓; typed IPC + push events (Tasks 2, 9, 10) ✓; Devices tab live with loading/empty states + honest `signal`/"awaiting pair" substitutions (Task 10) ✓; unprivileged, local-subnet-only (subnet bounded to /24, Task 3) ✓.
- **Placeholder scan:** none — every step has concrete code/commands. The only intentionally thin (non-unit-tested) module is `probes.ts`, exercised by the Task 11 manual run, as noted.
- **Type/name consistency:** `DiscoveredHost`, `DeviceClass`, `Device`, and the extended `VantaBridge` (with `devices.list`/`devices.subscribe`) are defined in Task 2 and used identically in `store`/`discovery`/`ipc`/`preload`/`useDevices`. IPC channels `vanta:devices:list` (invoke) and `vanta:devices` (event) match between `ipc.ts`, `index.ts`, and `preload`.

---

## Next phases (separate plans)
3. **Topology** — gateway-rooted radial layout from discovered hosts → Network tab.
4. **Vulnerabilities** — `portscan` + progressive `nmap`/`vulners`.
5. **Threats** — rule engine over deltas/findings (introduces the durable SQLite `Store`).
6. **Dashboard wiring + packaging**.
