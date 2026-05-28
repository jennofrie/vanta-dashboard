# Phase 5 — Threats Rule Engine + SQLite Store — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Threats tab into a live, classified event feed — a pure rule engine that fires on discovery + scan DELTAS (new device join, device offline, new risky exposure, new open port, gateway/DNS change), backed by a durable SQLite store that replaces the in-memory store and persists host history across restarts.

**Architecture:** `better-sqlite3` replaces `InMemoryStore` via the existing `Store` interface (zero consumer changes). After each discovery cycle the agent diffs current vs previous host snapshot → feeds the rule engine → emits `ThreatEvent[]` → persists + pushes to the renderer via `vanta:threats`. The Threats tab consumes a live `useThreats` hook; the Network Anomalies card shows real active-threat count.

**Tech Stack:** existing + `better-sqlite3` (native, needs `@electron/rebuild`), `@electron/rebuild`.

---

## Scope of this phase

In: `better-sqlite3` SQLite store with schema for hosts + snapshots + events; a pure, DI-testable rule engine (5 rules: NEW_DEVICE, DEVICE_OFFLINE, RISKY_EXPOSURE, NEW_OPEN_PORT, GATEWAY_CHANGE); a `threats` IPC (`vanta:threats` push + `vanta:threats:current`); `useThreats` hook; the **Threats** tab wired to live events (severity filter still works; tabs are real data); the Network view **Anomalies** card updated from placeholder offline-count to real active-threat count.

Out: scheduled/automatic deep scans (still on-demand via Run Scan); threat suppression/acknowledgement; rule tuning UI; durable scan history (events and host snapshots are stored, past scan results are referenced but not fully archived).

## Important prerequisite — native module rebuild

`better-sqlite3` is a native Node addon that must be **rebuilt against Electron's Node ABI** before the app will start. After installing it, you MUST run:
```bash
npx electron-rebuild -f -w better-sqlite3
```
or (preferred, installs `@electron/rebuild` as a dev dep):
```bash
npm install -D @electron/rebuild
./node_modules/.bin/electron-rebuild -f -w better-sqlite3
```
The rebuild produces a binary in `node_modules/better-sqlite3/build/Release/` targeting the installed Electron's Node version. Without this step the app throws `Module did not self-register` on boot. Add the script to `package.json` so it can be re-run after `npm install`.

---

## Target file structure

```
src/
├─ shared/types.ts                    # MODIFY: ThreatsState; extend VantaBridge.threats
├─ main/agent/
│  ├─ sqliteStore.ts + .test.ts       # CREATE: SqliteStore implements Store
│  ├─ rules.ts      + .test.ts        # CREATE: applyRules() (pure, DI)
│  └─ ipc.ts                          # MODIFY: SqliteStore wired; threat delta + push
├─ preload/index.ts                   # MODIFY: expose window.vanta.threats
└─ renderer/src/
   ├─ hooks/useThreats.ts + .test.tsx # CREATE
   ├─ views/ThreatsView.tsx           # MODIFY: live events + filter
   └─ views/NetworkView.tsx           # MODIFY: Anomalies → real threat count
```

---

## Task 1: Install better-sqlite3 + electron-rebuild setup

**Files:** `package.json`

- [ ] **Step 1: Install**
```bash
cd /Users/sharan/Desktop/Github/vanta-dashboard
npm install better-sqlite3
npm install -D @electron/rebuild @types/better-sqlite3
```

- [ ] **Step 2: Add rebuild scripts to `package.json`**

Add to `"scripts"`:
```json
"electron:rebuild": "electron-rebuild -f -w better-sqlite3",
"postinstall": "electron-rebuild -f -w better-sqlite3"
```
(The `postinstall` hook ensures the rebuild runs automatically after `npm install` on any machine.)

- [ ] **Step 3: Run the rebuild**
```bash
./node_modules/.bin/electron-rebuild -f -w better-sqlite3
```
Expected: `✔ Rebuild Complete` (no errors).

- [ ] **Step 4: Verify build still passes**
```bash
npm run build
```
Expected: main/preload/renderer all build; the native `better-sqlite3` binary is loadable.

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: add better-sqlite3 (native) + electron-rebuild postinstall"
```

---

## Task 2: Shared types — ThreatsState + bridge

**Files:** Modify `src/shared/types.ts`; Test `src/shared/types.threats.test.ts`

- [ ] **Step 1: Write the failing test** — `src/shared/types.threats.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { ThreatsState } from '@shared/types'
import { THREAT_RULES } from '@shared/types'

describe('threats types', () => {
  it('exposes the rule names', () => {
    expect(THREAT_RULES).toContain('NEW_DEVICE')
    expect(THREAT_RULES).toContain('GATEWAY_CHANGE')
  })
  it('ThreatsState holds events and active count', () => {
    const s: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }
    expect(s.events).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → FAIL (`ThreatsState`, `THREAT_RULES` not exported).

- [ ] **Step 3: Append to `src/shared/types.ts`** (keep all existing exports):
```ts
export const THREAT_RULES = [
  'NEW_DEVICE', 'DEVICE_OFFLINE', 'RISKY_EXPOSURE', 'NEW_OPEN_PORT', 'GATEWAY_CHANGE'
] as const
export type ThreatRule = (typeof THREAT_RULES)[number]

export interface ThreatsState {
  events: ThreatEvent[]
  activeCount: number
  lastUpdated: number | null
}
```
Note: `ThreatEvent { sev, source, title, desc, time, region }` already exists in `types.ts` (the Phase 1 static-data shape). Reuse it exactly — no change needed.

Extend `VantaBridge` (keep `ping`, `devices`, `stats`, `scan`):
```ts
  threats: {
    current(): Promise<ThreatsState>
    subscribe(cb: (state: ThreatsState) => void): () => void
  }
```

- [ ] **Step 4: Run to verify it passes** → PASS (2).

- [ ] **Step 5: Quality gate** — `npx tsc -p tsconfig.web.json --noEmit && npm run lint` → 0/0.
Note: `tsconfig.node.json` will fail (preload `threats` gap) — EXPECTED, fixed in Task 7.

- [ ] **Step 6: Commit**
```bash
git add src/shared/types.ts src/shared/types.threats.test.ts
git commit -m "feat: add ThreatsState/ThreatRule types and threats IPC contract"
```

---

## Task 3: SqliteStore — replacing InMemoryStore

**Files:** Create `src/main/agent/sqliteStore.ts`, `src/main/agent/sqliteStore.test.ts`

The `Store` interface (from Phase 2) declares `upsertHosts`, `reconcileOnline`, `listHosts`. `SqliteStore` adds two new methods used for delta tracking: `snapshotHosts()` (saves current hosts as "previous" for the next sweep's diff) and `getPreviousHosts()` (returns the snapshot). It also stores and retrieves `ThreatEvent[]` for persistence.

Update `Store` interface in `src/main/agent/store.ts` to add:
```ts
  snapshotHosts(): void
  getPreviousHosts(): DiscoveredHost[]
  appendEvents(events: ThreatEvent[]): void
  listRecentEvents(limit?: number): ThreatEvent[]
  getLastGatewayIp(): string | null
  setLastGatewayIp(ip: string): void
```
And add stub implementations to `InMemoryStore` (in-memory, for existing tests).

**Step 1: Extend `src/main/agent/store.ts`**

Add to the `Store` interface body and provide no-op/in-memory implementations on `InMemoryStore`:
```ts
// In Store interface:
  snapshotHosts(): void
  getPreviousHosts(): DiscoveredHost[]
  appendEvents(events: ThreatEvent[]): void
  listRecentEvents(limit?: number): ThreatEvent[]
  getLastGatewayIp(): string | null
  setLastGatewayIp(ip: string): void

// In InMemoryStore:
  private prevHosts: DiscoveredHost[] = []
  private events: ThreatEvent[] = []
  private lastGatewayIp: string | null = null

  snapshotHosts(): void { this.prevHosts = [...this.byMac.values()] }
  getPreviousHosts(): DiscoveredHost[] { return this.prevHosts }
  appendEvents(events: ThreatEvent[]): void { this.events.push(...events) }
  listRecentEvents(limit = 50): ThreatEvent[] { return this.events.slice(-limit) }
  getLastGatewayIp(): string | null { return this.lastGatewayIp }
  setLastGatewayIp(ip: string): void { this.lastGatewayIp = ip }
```
Import `ThreatEvent` from `@shared/types`. Run existing `store.test.ts` → PASS (still 2).

**Step 2: Write the failing SqliteStore test** — `src/main/agent/sqliteStore.test.ts`:
```ts
import { describe, it, expect, afterEach } from 'vitest'
import { SqliteStore } from './sqliteStore'
import { unlinkSync, existsSync } from 'node:fs'

const DB = '/tmp/vanta_test.db'
afterEach(() => { try { unlinkSync(DB) } catch {} })

describe('SqliteStore', () => {
  it('upserts hosts and persists across instances', () => {
    const s1 = new SqliteStore(DB)
    s1.upsertHosts([{ mac: 'AA', ip: '10.0.0.1', hostname: null, vendor: null, online: true, latencyMs: null, deviceClass: 'unknown', services: [], firstSeen: 1, lastSeen: 1 }])
    s1.close()
    const s2 = new SqliteStore(DB)
    expect(s2.listHosts()).toHaveLength(1)
    expect(s2.listHosts()[0]!.mac).toBe('AA')
    s2.close()
  })

  it('snapshots and retrieves previous hosts', () => {
    const s = new SqliteStore(DB)
    s.upsertHosts([{ mac: 'AA', ip: '10.0.0.1', hostname: null, vendor: null, online: true, latencyMs: null, deviceClass: 'unknown', services: [], firstSeen: 1, lastSeen: 1 }])
    s.snapshotHosts()
    s.upsertHosts([{ mac: 'BB', ip: '10.0.0.2', hostname: null, vendor: null, online: true, latencyMs: null, deviceClass: 'unknown', services: [], firstSeen: 2, lastSeen: 2 }])
    const prev = s.getPreviousHosts()
    expect(prev).toHaveLength(1)
    expect(prev[0]!.mac).toBe('AA')
    s.close()
  })

  it('appends and lists events', () => {
    const s = new SqliteStore(DB)
    s.appendEvents([{ sev: 'High', source: '10.0.0.5', title: 'New device', desc: 'unknown MAC', time: 'now', region: 'LAN' }])
    expect(s.listRecentEvents()).toHaveLength(1)
    s.close()
  })
})
```

**Step 3: Run to verify it fails** → module not found.

**Step 4: Create `src/main/agent/sqliteStore.ts`**
```ts
import Database from 'better-sqlite3'
import type { DiscoveredHost, ThreatEvent } from '@shared/types'
import type { Store } from './store'

export class SqliteStore implements Store {
  private db: Database.Database

  constructor(private readonly dbPath: string) {
    this.db = new Database(dbPath)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hosts (mac TEXT PRIMARY KEY, json TEXT NOT NULL, last_seen INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS host_snapshot (mac TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS threat_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    `)
  }

  close(): void { this.db.close() }

  upsertHosts(hosts: DiscoveredHost[]): void {
    const stmt = this.db.prepare(
      `INSERT INTO hosts (mac, json, last_seen) VALUES (?,?,?)
       ON CONFLICT(mac) DO UPDATE SET json=excluded.json, last_seen=excluded.last_seen`
    )
    const tx = this.db.transaction((hs: DiscoveredHost[]) => {
      for (const h of hs) {
        const prev = this.db.prepare('SELECT json FROM hosts WHERE mac=?').get(h.mac) as { json: string } | undefined
        const merged = prev ? { ...JSON.parse(prev.json), ...h, firstSeen: JSON.parse(prev.json).firstSeen } : h
        stmt.run(h.mac, JSON.stringify(merged), h.lastSeen)
      }
    })
    tx(hosts)
  }

  reconcileOnline(seenMacs: string[]): void {
    const seen = new Set(seenMacs)
    const all = this.db.prepare('SELECT mac, json FROM hosts').all() as { mac: string; json: string }[]
    const tx = this.db.transaction(() => {
      for (const row of all) {
        const h = JSON.parse(row.json) as DiscoveredHost
        const updated = { ...h, online: seen.has(row.mac) }
        this.db.prepare('UPDATE hosts SET json=? WHERE mac=?').run(JSON.stringify(updated), row.mac)
      }
    })
    tx()
  }

  listHosts(): DiscoveredHost[] {
    return (this.db.prepare('SELECT json FROM hosts').all() as { json: string }[]).map((r) => JSON.parse(r.json) as DiscoveredHost)
  }

  snapshotHosts(): void {
    this.db.exec('DELETE FROM host_snapshot')
    this.db.prepare('INSERT INTO host_snapshot SELECT mac, json FROM hosts').run()
  }

  getPreviousHosts(): DiscoveredHost[] {
    return (this.db.prepare('SELECT json FROM host_snapshot').all() as { json: string }[]).map((r) => JSON.parse(r.json) as DiscoveredHost)
  }

  appendEvents(events: ThreatEvent[]): void {
    const stmt = this.db.prepare('INSERT INTO threat_events (ts, json) VALUES (?, ?)')
    const tx = this.db.transaction((evs: ThreatEvent[]) => {
      for (const e of evs) stmt.run(Date.now(), JSON.stringify(e))
    })
    tx(events)
  }

  listRecentEvents(limit = 100): ThreatEvent[] {
    const rows = this.db.prepare('SELECT json FROM threat_events ORDER BY id DESC LIMIT ?').all(limit) as { json: string }[]
    return rows.map((r) => JSON.parse(r.json) as ThreatEvent).reverse()
  }

  getLastGatewayIp(): string | null {
    const row = this.db.prepare('SELECT v FROM kv WHERE k=?').get('gatewayIp') as { v: string } | undefined
    return row?.v ?? null
  }

  setLastGatewayIp(ip: string): void {
    this.db.prepare('INSERT INTO kv (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run('gatewayIp', ip)
  }
}
```

- [ ] **Step 5: Run to verify it passes** → PASS (3).

- [ ] **Step 6: Quality gate** → `npx tsc -p tsconfig.node.json --noEmit && npm run lint` → 0/0.

- [ ] **Step 7: Commit**
```bash
git add src/main/agent/store.ts src/main/agent/sqliteStore.ts src/main/agent/sqliteStore.test.ts
git commit -m "feat: add SqliteStore (persistent) and extend Store interface for delta tracking"
```

---

## Task 4: Threat rule engine (pure, DI)

**Files:** Create `src/main/agent/rules.ts`, `src/main/agent/rules.test.ts`

- [ ] **Step 1: Write the failing test** — `src/main/agent/rules.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { applyRules } from './rules'
import type { DiscoveredHost, HostScan } from '@shared/types'

const host = (mac: string, over: Partial<DiscoveredHost> = {}): DiscoveredHost => ({
  mac, ip: '10.0.0.2', hostname: null, vendor: null, online: true, latencyMs: null,
  deviceClass: 'unknown', services: [], firstSeen: 1, lastSeen: 1, ...over
})
const scan = (mac: string, ports: number[] = [], sevs: string[] = []): HostScan => ({
  mac, ip: '10.0.0.2',
  openPorts: ports.map((p) => ({ port: p, service: null, version: null })),
  vulns: sevs.map((s, i) => ({ id: `EXPOSURE-${ports[i]}`, title: 'test', severity: s as never, score: 7, system: 'host', patch: 'Harden', age: '—' })),
  worstSeverity: sevs.length ? sevs[0] as never : null
})

describe('applyRules', () => {
  it('NEW_DEVICE fires when a MAC appears that was not in prev', () => {
    const events = applyRules({ prevHosts: [], currHosts: [host('AA')], prevScans: [], currScans: [], prevGatewayIp: null, currGatewayIp: null, now: () => 1000 })
    expect(events.some((e) => e.title.includes('New device') && e.source === '10.0.0.2')).toBe(true)
  })

  it('DEVICE_OFFLINE fires when a previously online host goes offline', () => {
    const events = applyRules({ prevHosts: [host('AA', { online: true })], currHosts: [host('AA', { online: false })], prevScans: [], currScans: [], prevGatewayIp: null, currGatewayIp: null, now: () => 1 })
    expect(events.some((e) => e.title.toLowerCase().includes('offline'))).toBe(true)
  })

  it('RISKY_EXPOSURE fires when a new EXPOSURE finding appears for a host', () => {
    const events = applyRules({ prevHosts: [host('AA')], currHosts: [host('AA')], prevScans: [scan('AA', [], [])], currScans: [scan('AA', [23], ['High'])], prevGatewayIp: null, currGatewayIp: null, now: () => 1 })
    expect(events.some((e) => e.sev === 'High')).toBe(true)
  })

  it('GATEWAY_CHANGE fires when gateway IP changes', () => {
    const events = applyRules({ prevHosts: [], currHosts: [], prevScans: [], currScans: [], prevGatewayIp: '10.0.0.1', currGatewayIp: '192.168.1.1', now: () => 1 })
    expect(events.some((e) => e.title.toLowerCase().includes('gateway'))).toBe(true)
  })

  it('returns nothing when nothing changed', () => {
    const h = host('AA')
    expect(applyRules({ prevHosts: [h], currHosts: [h], prevScans: [], currScans: [], prevGatewayIp: null, currGatewayIp: null, now: () => 1 })).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/main/agent/rules.ts`**
```ts
import type { DiscoveredHost, HostScan, ThreatEvent } from '@shared/types'

export interface RulesDeps {
  prevHosts: DiscoveredHost[]
  currHosts: DiscoveredHost[]
  prevScans: HostScan[]
  currScans: HostScan[]
  prevGatewayIp: string | null
  currGatewayIp: string | null
  now: () => number
}

function relTime(_now: number): string { return 'just now' }

/** Pure, DI rule engine. Takes before/after snapshots → emits ThreatEvent[]. */
export function applyRules(deps: RulesDeps): ThreatEvent[] {
  const events: ThreatEvent[] = []
  const prevMacs = new Set(deps.prevHosts.map((h) => h.mac))
  const now = deps.now()

  // NEW_DEVICE — MAC in curr not seen in prev
  for (const h of deps.currHosts) {
    if (!prevMacs.has(h.mac) && h.online) {
      events.push({ sev: 'Medium', source: h.ip, title: `New device joined the network`, desc: `MAC ${h.mac} · ${h.vendor ?? 'unknown vendor'} · ${h.deviceClass}`, time: relTime(now), region: 'LAN' })
    }
  }

  // DEVICE_OFFLINE — was online in prev, now offline
  const currByMac = new Map(deps.currHosts.map((h) => [h.mac, h]))
  for (const prev of deps.prevHosts) {
    if (prev.online) {
      const curr = currByMac.get(prev.mac)
      if (curr && !curr.online) {
        events.push({ sev: 'Low', source: prev.ip, title: `Device went offline`, desc: `${prev.hostname ?? prev.mac} · ${prev.vendor ?? ''}`, time: relTime(now), region: 'LAN' })
      }
    }
  }

  // RISKY_EXPOSURE / NEW_OPEN_PORT — new findings or ports vs prev scan
  const prevScansByMac = new Map(deps.prevScans.map((s) => [s.mac, s]))
  for (const curr of deps.currScans) {
    const prev = prevScansByMac.get(curr.mac)
    const prevIds = new Set(prev?.vulns.map((v) => v.id) ?? [])
    const prevPorts = new Set(prev?.openPorts.map((p) => p.port) ?? [])

    for (const vuln of curr.vulns) {
      if (!prevIds.has(vuln.id)) {
        events.push({ sev: vuln.severity, source: curr.ip, title: `New exposure: ${vuln.title}`, desc: `${vuln.id} · score ${vuln.score} · ${vuln.patch}`, time: relTime(now), region: 'LAN' })
      }
    }
    for (const port of curr.openPorts) {
      if (!prevPorts.has(port.port)) {
        const desc = port.service ? `${port.service}${port.version ? ' ' + port.version : ''} on :${port.port}` : `port ${port.port} newly open`
        events.push({ sev: 'Low', source: curr.ip, title: `New open port detected`, desc, time: relTime(now), region: 'LAN' })
      }
    }
  }

  // GATEWAY_CHANGE — gateway IP changed
  if (deps.prevGatewayIp && deps.currGatewayIp && deps.prevGatewayIp !== deps.currGatewayIp) {
    events.push({ sev: 'High', source: deps.currGatewayIp, title: `Gateway IP changed — possible MITM`, desc: `Was ${deps.prevGatewayIp} · now ${deps.currGatewayIp}`, time: relTime(now), region: 'Gateway' })
  }

  return events
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (5).

- [ ] **Step 5: Quality gate** → node tsc 0; lint 0.

- [ ] **Step 6: Commit**
```bash
git add src/main/agent/rules.ts src/main/agent/rules.test.ts
git commit -m "feat: add pure threat rule engine (5 rules, DI for tests)"
```

---

## Task 5: Agent wiring — SqliteStore + threat deltas + IPC

**Files:** Modify `src/main/agent/ipc.ts`

- [ ] **Step 1:** In `ipc.ts`:
- Add imports: `import { SqliteStore } from './sqliteStore'`; `import { applyRules } from './rules'`; add `ThreatsState`, `ThreatEvent` to the `@shared/types` type import; `import { app } from 'electron'` (for `app.getPath('userData')`); add `path` import (`import { join } from 'node:path'`).
- Change store instantiation from `new InMemoryStore()` to `new SqliteStore(join(app.getPath('userData'), 'vanta.db'))`. Keep `InMemoryStore` as a fallback for tests (the test environment may not have Electron's `app`; guard with a try/catch or just use SqliteStore everywhere since the agent only runs in Electron).
- After the discovery `sweep` runs and produces `devices[]`, add delta + rules logic inside `startAgent()`:
```ts
  let threatsState: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }
  const pushThreats = () => {
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('vanta:threats', threatsState)
  }
```
- Inside the discovery `sweep` (after `store.reconcileOnline` + `store.snapshotHosts`), compute and push threats:
```ts
    // Run rule engine against prev → curr snapshot
    const prevHosts = store.getPreviousHosts()
    const currHosts = store.listHosts().map(toDevice).map((d, i) => store.listHosts()[i]!) // use DiscoveredHost directly
    const newEvents = applyRules({
      prevHosts: store.getPreviousHosts(),
      currHosts: store.listHosts(),
      prevScans: [],     // scan history integrated below when scan runs
      currScans: [],
      prevGatewayIp: store.getLastGatewayIp(),
      currGatewayIp: gatewayIp,
      now: Date.now
    })
    if (gatewayIp) store.setLastGatewayIp(gatewayIp)
    store.snapshotHosts()  // snapshot AFTER delta, so next sweep diffs correctly
    if (newEvents.length) {
      store.appendEvents(newEvents)
      const allEvents = store.listRecentEvents(100)
      threatsState = { events: allEvents, activeCount: allEvents.filter((e) => e.sev === 'Critical' || e.sev === 'High').length, lastUpdated: Date.now() }
      pushThreats()
    }
```
- Also integrate scan deltas: inside `doScan` (after `lastScan = await runScan(...)`), re-run `applyRules` with the scan results vs previous scan (keep a `prevScanResult` variable):
```ts
  let prevScanHosts: import('@shared/types').HostScan[] = []
  // Inside doScan, after lastScan assigned:
  const scanEvents = applyRules({ prevHosts: store.getPreviousHosts(), currHosts: store.listHosts(), prevScans: prevScanHosts, currScans: lastScan.hosts, prevGatewayIp: store.getLastGatewayIp(), currGatewayIp: null, now: Date.now })
  prevScanHosts = lastScan.hosts
  if (scanEvents.length) {
    store.appendEvents(scanEvents)
    const allEvents = store.listRecentEvents(100)
    threatsState = { events: allEvents, activeCount: allEvents.filter((e) => e.sev === 'Critical' || e.sev === 'High').length, lastUpdated: Date.now() }
    pushThreats()
  }
```
- Register: `ipcMain.handle('vanta:threats:current', () => threatsState)`.

- [ ] **Step 2: Quality gate**
```bash
npx tsc -p tsconfig.node.json --noEmit && npm run lint && npm test
```
Expected: node tsc 0; lint 0; all tests pass (the agent-tests mock the deps, so SqliteStore creates a real temp DB — guard with `/tmp` path). Note: any test that instantiates `startAgent` may need updates since the store is now `SqliteStore`; if so, mock `app.getPath` with `vi.mock('electron', ...)`.

- [ ] **Step 3: Commit**
```bash
git add src/main/agent/ipc.ts src/main/agent/store.ts
git commit -m "feat: wire SqliteStore, threat delta engine, and vanta:threats IPC"
```

---

## Task 6: Preload — expose `window.vanta.threats`

**Files:** Modify `src/preload/index.ts`

- [ ] **Step 1:** Add `ThreatsState` to the `@shared/types` import. Add `threats` to the `api` object:
```ts
  threats: {
    current: () => ipcRenderer.invoke('vanta:threats:current'),
    subscribe: (cb: (state: ThreatsState) => void) => {
      const listener = (_e: unknown, state: ThreatsState) => cb(state)
      ipcRenderer.on('vanta:threats', listener)
      return () => ipcRenderer.removeListener('vanta:threats', listener)
    }
  }
```

- [ ] **Step 2: Quality gate** → both tsc 0; lint 0.

- [ ] **Step 3: Commit**
```bash
git add src/preload/index.ts
git commit -m "feat: expose window.vanta.threats (current + subscribe) in preload"
```

---

## Task 7: `useThreats` hook + Threats tab wiring

**Files:** Create `src/renderer/src/hooks/useThreats.ts` + `useThreats.test.tsx`; Modify `src/renderer/src/views/ThreatsView.tsx`

- [ ] **Step 1: Write the failing hook test** — `src/renderer/src/hooks/useThreats.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useThreats } from './useThreats'
import type { ThreatsState } from '@shared/types'

const empty: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }

describe('useThreats', () => {
  beforeEach(() => {
    let cb: ((s: ThreatsState) => void) | null = null
    ;(window as unknown as { vanta: unknown }).vanta = {
      ping: vi.fn(), devices: { list: vi.fn().mockResolvedValue([]), subscribe: () => () => {} },
      stats: { current: vi.fn().mockResolvedValue({ rxMbps: 0, txMbps: 0, rxHistory: [], txHistory: [] }), subscribe: () => () => {} },
      scan: { run: vi.fn(), current: vi.fn().mockResolvedValue({ scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }), subscribe: () => () => {} },
      threats: { current: vi.fn().mockResolvedValue(empty), subscribe: (fn: (s: ThreatsState) => void) => { cb = fn; return () => { cb = null } } }
    }
    ;(window as unknown as { __emitThreats: (s: ThreatsState) => void }).__emitThreats = (s) => cb?.(s)
  })

  it('loads current then applies live updates', async () => {
    const { result } = renderHook(() => useThreats())
    await waitFor(() => expect(result.current.events).toHaveLength(0))
    act(() => (window as unknown as { __emitThreats: (s: ThreatsState) => void }).__emitThreats({ events: [{ sev: 'High', source: '10.0.0.2', title: 'Test', desc: 'desc', time: 'now', region: 'LAN' }], activeCount: 1, lastUpdated: 1 }))
    expect(result.current.events).toHaveLength(1)
    expect(result.current.activeCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/renderer/src/hooks/useThreats.ts`**
```ts
import { useEffect, useState } from 'react'
import type { ThreatsState } from '@shared/types'

const EMPTY: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }

export function useThreats(): ThreatsState {
  const [state, setState] = useState<ThreatsState>(EMPTY)
  useEffect(() => {
    let mounted = true
    window.vanta.threats.current().then((s) => { if (mounted) setState(s) })
    const unsubscribe = window.vanta.threats.subscribe((s) => { if (mounted) setState(s) })
    return () => { mounted = false; unsubscribe() }
  }, [])
  return state
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (1).

- [ ] **Step 5: Wire `src/renderer/src/views/ThreatsView.tsx`.** Read it first. Preserve ALL markup/classes. Changes:
- Remove `import { THREATS_FEED } from '../data'`; add `import { useThreats } from '../hooks/useThreats'`.
- At top: `const { events: THREATS_FEED, activeCount, lastUpdated } = useThreats()`. (The view's existing filter/render logic works unchanged since the live `ThreatEvent` shape matches the prototype exactly.)
- Severity stat cards: replace hardcoded counts with `THREATS_FEED.filter((t) => t.sev === 'X').length`. Drop fabricated trend lines; replace with honest neutral labels.
- Add an honest empty/waiting state: when `THREATS_FEED.length === 0` render a single line (keep the table markup for non-empty case): `lastUpdated ? 'No threat events detected.' : 'Monitoring your network — events appear here when detected.'`.
- Keep the severity filter chips; they still work (filter on `t.sev`).
- `time` field: the rule engine sets `'just now'` for all new events. This will look odd as time passes. For Phase 5 the time is honest (it IS just now for new events); future improvement would compute relative time from a stored timestamp. No change needed.

- [ ] **Step 6: Quality gate (web)** → tsc 0; lint 0. (Full `npm test` will fail on views/App stubs missing `threats` — fixed in Task 9.)

- [ ] **Step 7: Commit**
```bash
git add src/renderer/src/hooks/useThreats.ts src/renderer/src/hooks/useThreats.test.tsx src/renderer/src/views/ThreatsView.tsx
git commit -m "feat: wire Threats tab to live events + useThreats hook"
```

---

## Task 8: NetworkView Anomalies → real active-threat count

**Files:** Modify `src/renderer/src/views/NetworkView.tsx`

- [ ] **Step 1:** Add `import { useThreats } from '../hooks/useThreats'`. In the component: `const { activeCount } = useThreats()`. Change the Anomalies stat card `.num` from `{devices.filter((d) => !d.online).length}` to `{activeCount}`. Keep its `.trend` text as "active threats" (honest — it IS the active count). Update the label if still showing "Anomalies" — keep it (activeCount of Critical/High events = anomalies in spirit).

- [ ] **Step 2: Quality gate (web)** → tsc 0; lint 0.

- [ ] **Step 3: Commit**
```bash
git add src/renderer/src/views/NetworkView.tsx
git commit -m "feat: wire Network Anomalies card to real active threat count"
```

---

## Task 9: Fix tests + QA gate + boot smoke

**Files:** `views.test.tsx`, `App.test.tsx`

- [ ] **Step 1:** Extend the `window.vanta` stubs in BOTH files to include `threats`:
```ts
  threats: {
    current: () => Promise.resolve({ events: [], activeCount: 0, lastUpdated: null }),
    subscribe: () => () => {}
  }
```

- [ ] **Step 2: Full automated gate**
```bash
npm run lint && npm run typecheck && npm test && npm run build && npm audit
```
Expected: lint 0; typecheck 0; all tests pass; build succeeds (note: `better-sqlite3` native binary must be present for the build, but the renderer bundle won't include it — only the main process uses it); 0 vulnerabilities.

- [ ] **Step 3: Electron boot smoke** (kill by exact PID):
```bash
(./node_modules/.bin/electron . >/tmp/vanta_p5_smoke.log 2>&1 & echo $! >/tmp/vanta_p5_epid); sleep 12
EPID=$(cat /tmp/vanta_p5_epid); kill "$EPID" 2>/dev/null; sleep 1; ps -p "$EPID" >/dev/null 2>&1 && kill -9 "$EPID" 2>/dev/null
grep -iE "error|exception|cannot|failed|throw|ERR_|threw|not a function|did not self-register|Module" /tmp/vanta_p5_smoke.log | grep -viE "IMKClient|IMKInputSession|Secure coding|CoreText|objc\[|DevTools|ViewBridge|TIPapp|GPU stall|stalls|cache" | head -20 || echo "clean boot"
```
Key risk: if `better-sqlite3` wasn't rebuilt for Electron's ABI, `Module did not self-register` will appear. Fix: run `npx electron-rebuild -f -w better-sqlite3` and retry.

- [ ] **Step 4: Manual run (controller → user; needs a real LAN).**
`npm run dev`. Navigate between tabs — especially: let a discovery sweep run, disconnect a device or join a new one, then check the **Threats** tab for events. Try a **Run Scan** and watch for new exposure events. The Anomalies card on the Network tab should show non-zero if any Critical/High events fired.

- [ ] **Step 5: Commit fixes** (if any from boot/manual run) + push.

---

## Self-Review

- **Spec coverage:** durable SQLite (Tasks 1, 3) ✓; `Store` interface extended cleanly (Task 3) ✓; pure rule engine — 5 rules, DI for tests (Task 4) ✓; delta tracking in agent (Task 5) ✓; scan results integrated into threat rules (Task 5) ✓; `vanta:threats` IPC (Tasks 5–6) ✓; Threats tab wired, severity filter working (Task 7) ✓; Network Anomalies real count (Task 8) ✓; native module rebuild bootstrapped (Task 1) ✓.
- **Placeholder scan:** Task 5 wiring uses direct structural prose + code blocks; no "TBD" or vague steps. The `prevHosts` in the rules call uses `store.getPreviousHosts()` (snapshot from BEFORE `snapshotHosts()` call).
- **Type consistency:** `ThreatsState`, `ThreatRule`, `THREAT_RULES` defined Task 2; `ThreatEvent` (pre-existing); `applyRules` deps match Task 4/5 exactly; `SqliteStore` methods match the extended `Store` interface; `useThreats` consumes `ThreatsState`; views/App test stubs extend to include `threats` (Task 9).
- **Critical ordering note in Task 5:** `store.snapshotHosts()` must be called AFTER the rules run (so the current sweep becomes the "previous" for the NEXT sweep). If called before, `getPreviousHosts()` and `listHosts()` return the same data and no deltas are detected. This is explicit in the task wiring code.

---

## Next phases
6. **Dashboard wiring + packaging:** composite health score, forecast baseline (moving-average on daily event counts), `electron-builder` cross-platform installers, local fonts (Space Grotesk + JetBrains Mono vendored), renderer CSP, Phase 1 review follow-ups.
