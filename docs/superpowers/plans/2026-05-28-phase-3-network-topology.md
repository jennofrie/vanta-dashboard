# Phase 3 — Network Topology from Real Hosts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Network tab's static topology/stat-cards with the user's real LAN — a gateway-rooted radial graph built from live discovered devices, real per-host detail, and this-host interface throughput.

**Architecture:** Topology is derived in the renderer from the existing live `Device[]` stream (`useDevices`) via a pure `buildTopology()` — no new topology IPC. A small `stats` IPC (agent → renderer) supplies interface throughput for the Ingress/Egress cards. The Network view consumes both and preserves the prototype's exact look.

**Tech Stack:** existing (Electron, electron-vite, React 19, TS, `systeminformation`, Vitest).

---

## Scope of this phase

In: a pure `buildTopology(devices)` (radial layout, gateway detection, star edges, presence-based state); a `stats` IPC for this-host RX/TX throughput with a rolling history for the sparklines; `useTopology` + `useNetStats` hooks; the **Network** tab fully wired to live data (topology map, node detail panel, 4 stat cards) at 99% fidelity; `vendor` added to the UI `Device` for the detail panel.

Out (later phases): port scanning + open-ports in the detail panel (Phase 4); CVE/threat-driven **red** node states + Anomalies feed (Phases 4–5); per-host latency probing; durable history/SQLite.

## Key design decisions

1. **Renderer-computed topology.** `buildTopology(devices)` runs in the renderer from `useDevices` data. The gateway is the device with `role === 'Gateway'`; it becomes the central node, others radiate out on a ring; edges are a star (each host → gateway). Pure + unit-tested. It only references nodes it creates, so there are no dangling-edge crashes (resolves the Phase 1 review note).
2. **Presence-based node state (Phase 3 limit).** `ok` = online host, `warn` = offline host, gateway = central `ok` core. **No `red`** — risk/compromise states require vuln+threat data (Phases 4–5). The `.node.red` pulse markup stays in the view; nothing emits `red` yet.
3. **Throughput via a `stats` IPC (honest substitution).** The agent polls `systeminformation.networkStats()` for the active interface on a fast (~3s) cadence, keeps a short rolling history, and pushes `vanta:stats` (rx/tx Mbps + history arrays for the sparklines). This is *this host's* interface, not whole-LAN — per the spec's honest substitution. Devices card = live count; Anomalies card = offline count for now.
4. **Node detail panel = real available fields.** Status, IP, MAC, Vendor, Type. Latency + open ports are shown as `—`/omitted until later phases supply them. Add optional `vendor?: string` to the UI `Device` so the agent can surface it.
5. **99% fidelity preserved** — only data sources change; markup/classes/styles stay identical.

## Target file structure

```
src/
├─ shared/types.ts                      # MODIFY: NetStats; Device.vendor?; VantaBridge.stats
├─ main/agent/
│  ├─ probes.ts                         # MODIFY: add netStats() probe
│  ├─ ipc.ts                            # MODIFY: toDevice adds vendor; start stats poller + channels
│  └─ netstats.ts                       # CREATE: rolling RX/TX history accumulator (pure-ish)
│     + netstats.test.ts
├─ preload/index.ts                     # MODIFY: expose window.vanta.stats
└─ renderer/src/
   ├─ topology.ts                       # CREATE: buildTopology(devices) (pure)
   │  + topology.test.ts
   ├─ hooks/useTopology.ts              # CREATE
   ├─ hooks/useNetStats.ts              # CREATE  (+ useNetStats.test.tsx)
   └─ views/NetworkView.tsx             # MODIFY: live topology + detail + stat cards
```

---

## Task 1: Shared types — NetStats, Device.vendor, stats bridge

**Files:** Modify `src/shared/types.ts`; Test `src/shared/types.stats.test.ts`

- [ ] **Step 1: Write the failing test** — `src/shared/types.stats.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { NetStats, Device } from '@shared/types'

describe('stats types', () => {
  it('NetStats carries current rates + history', () => {
    const s: NetStats = { rxMbps: 12.5, txMbps: 3.2, rxHistory: [1, 2], txHistory: [0, 1] }
    expect(s.rxHistory).toHaveLength(2)
  })
  it('Device accepts an optional vendor', () => {
    const d: Device = {
      name: 'x', type: 'Router', ico: 'router', mac: 'M', ip: '10.0.0.1',
      online: true, signal: 100, role: 'Gateway', vendor: 'Ubiquiti'
    }
    expect(d.vendor).toBe('Ubiquiti')
  })
})
```

- [ ] **Step 2: Run to verify it fails**
Run: `npx vitest run src/shared/types.stats.test.ts` → FAIL (`NetStats` not exported).

- [ ] **Step 3: Modify `src/shared/types.ts`**
- Add `vendor?: string` to the existing `Device` interface (append the field; keep all others).
- Append:
```ts
export interface NetStats {
  rxMbps: number
  txMbps: number
  rxHistory: number[]
  txHistory: number[]
}
```
- Extend `VantaBridge` (keep `ping` + `devices`) by adding:
```ts
  stats: {
    current(): Promise<NetStats>
    subscribe(cb: (stats: NetStats) => void): () => void
  }
```

- [ ] **Step 4: Run to verify it passes**
Run: `npx vitest run src/shared/types.stats.test.ts` → PASS (2).

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: web tsc 0; lint 0. NOTE: `tsconfig.node.json` will now fail because `src/preload/index.ts` doesn't implement `stats` yet — that is EXPECTED and fixed in Task 4. Report it; do not "fix" preload here.

- [ ] **Step 6: Commit**
```bash
git add src/shared/types.ts src/shared/types.stats.test.ts
git commit -m "feat: add NetStats type, Device.vendor, and stats IPC contract"
```

---

## Task 2: `buildTopology` (pure)

**Files:** Create `src/renderer/src/topology.ts`, `src/renderer/src/topology.test.ts`

- [ ] **Step 1: Write the failing test** — `src/renderer/src/topology.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildTopology } from './topology'
import type { Device } from '@shared/types'

const dev = (over: Partial<Device>): Device => ({
  name: 'n', type: 'Unknown', ico: 'globe', mac: 'M', ip: '10.0.0.9',
  online: true, signal: 100, role: 'Endpoint', ...over
})

describe('buildTopology', () => {
  it('puts the gateway at the centre and others on a ring, with star edges', () => {
    const gw = dev({ mac: 'GW', role: 'Gateway', ip: '10.0.0.1', name: 'Router' })
    const a = dev({ mac: 'A', ip: '10.0.0.2' })
    const b = dev({ mac: 'B', ip: '10.0.0.3', online: false })
    const { nodes, edges } = buildTopology([gw, a, b])

    const center = nodes.find((n) => n.id === 'GW')!
    expect(center.x).toBe(50)
    expect(center.y).toBe(50)
    // every non-gateway connects to the gateway
    expect(edges).toEqual(expect.arrayContaining([['A', 'GW'], ['B', 'GW']]))
    expect(edges).toHaveLength(2)
    // presence-based state
    expect(nodes.find((n) => n.id === 'A')!.state).toBe('ok')
    expect(nodes.find((n) => n.id === 'B')!.state).toBe('warn')
    // ring nodes are within the 0..100 viewbox
    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.x).toBeLessThanOrEqual(100)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeLessThanOrEqual(100)
    }
  })

  it('handles no gateway: all hosts on the ring, no edges', () => {
    const { nodes, edges } = buildTopology([dev({ mac: 'A' }), dev({ mac: 'B' })])
    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(0)
  })

  it('returns empty graph for no devices', () => {
    expect(buildTopology([])).toEqual({ nodes: [], edges: [] })
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/renderer/src/topology.ts`**
```ts
import type { Device, NetworkNode, NetworkEdge, TopologyGraph, NodeState } from '@shared/types'

const round = (n: number): number => Math.round(n * 10) / 10

/** Build a gateway-rooted radial topology from the live device list. Pure. */
export function buildTopology(devices: Device[]): TopologyGraph {
  if (devices.length === 0) return { nodes: [], edges: [] }

  const gateway = devices.find((d) => d.role === 'Gateway') ?? null
  const others = devices.filter((d) => d !== gateway)

  const nodes: NetworkNode[] = []
  const edges: NetworkEdge[] = []

  if (gateway) {
    nodes.push({ id: gateway.mac, x: 50, y: 50, label: gateway.name, ico: gateway.ico, state: 'ok', meta: gateway.ip })
  }

  const radius = 34
  const count = others.length
  others.forEach((d, i) => {
    const angle = (i / Math.max(1, count)) * 2 * Math.PI - Math.PI / 2
    const x = 50 + Math.cos(angle) * radius
    const y = 50 + Math.sin(angle) * radius
    const state: NodeState = d.online ? 'ok' : 'warn'
    nodes.push({ id: d.mac, x: round(x), y: round(y), label: d.name, ico: d.ico, state, meta: d.ip })
    if (gateway) edges.push([d.mac, gateway.mac])
  })

  return { nodes, edges }
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (3).

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: 0 / 0.

- [ ] **Step 6: Commit**
```bash
git add src/renderer/src/topology.ts src/renderer/src/topology.test.ts
git commit -m "feat: add pure buildTopology (radial layout, star edges, presence state)"
```

---

## Task 3: Net-stats accumulator + agent wiring

**Files:** Create `src/main/agent/netstats.ts` + `netstats.test.ts`; Modify `src/main/agent/probes.ts`, `src/main/agent/ipc.ts`

- [ ] **Step 1: Write the failing test** — `src/main/agent/netstats.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { NetStatsAccumulator } from './netstats'

describe('NetStatsAccumulator', () => {
  it('tracks current rates and a bounded rolling history', () => {
    const acc = new NetStatsAccumulator(3) // keep last 3 samples
    acc.push(10, 2)
    acc.push(20, 4)
    let s = acc.snapshot()
    expect(s.rxMbps).toBe(20)
    expect(s.txMbps).toBe(4)
    expect(s.rxHistory).toEqual([10, 20])
    acc.push(30, 6)
    acc.push(40, 8)
    s = acc.snapshot()
    expect(s.rxHistory).toEqual([20, 30, 40]) // bounded to 3, oldest dropped
    expect(s.txHistory).toEqual([4, 6, 8])
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/main/agent/netstats.ts`**
```ts
import type { NetStats } from '@shared/types'

/** Keeps the latest RX/TX Mbps plus a bounded rolling history for sparklines. */
export class NetStatsAccumulator {
  private rx: number[] = []
  private tx: number[] = []
  constructor(private readonly max = 12) {}

  push(rxMbps: number, txMbps: number): void {
    this.rx.push(rxMbps)
    this.tx.push(txMbps)
    if (this.rx.length > this.max) this.rx.shift()
    if (this.tx.length > this.max) this.tx.shift()
  }

  snapshot(): NetStats {
    return {
      rxMbps: this.rx.at(-1) ?? 0,
      txMbps: this.tx.at(-1) ?? 0,
      rxHistory: [...this.rx],
      txHistory: [...this.tx]
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (1).

- [ ] **Step 5: Add a `netStats` probe to `src/main/agent/probes.ts`** (append; keep existing exports):
```ts
/** Current RX/TX throughput (Mbps) for the default interface, via systeminformation. */
export async function netStats(): Promise<{ rxMbps: number; txMbps: number }> {
  try {
    const stats = await si.networkStats()
    const s = stats[0]
    if (!s) return { rxMbps: 0, txMbps: 0 }
    const toMbps = (bytesPerSec: number) => Math.max(0, Math.round((bytesPerSec * 8) / 1e6 * 10) / 10)
    return { rxMbps: toMbps(s.rx_sec ?? 0), txMbps: toMbps(s.tx_sec ?? 0) }
  } catch {
    return { rxMbps: 0, txMbps: 0 }
  }
}
```

- [ ] **Step 6: Wire stats into `src/main/agent/ipc.ts`.** Make these edits:
- Add `vendor: h.vendor ?? undefined` to the object returned by `toDevice` (so the UI gets vendor). Keep all other fields.
- Import the new pieces at the top: `import { NetStatsAccumulator } from './netstats'` and add `netStats` to the existing `./probes` import.
- Import the shared type: add `NetStats` to the `@shared/types` type import.
- Inside `startAgent()`, after the device scheduler is created, add a SECOND scheduler for throughput and a `vanta:stats:current` handler:
```ts
  const acc = new NetStatsAccumulator(12)
  const statsScheduler = new Scheduler<NetStats>({
    intervalMs: 3_000,
    sweep: async () => {
      const { rxMbps, txMbps } = await netStats()
      acc.push(rxMbps, txMbps)
      return acc.snapshot()
    },
    onResult: (stats) => {
      for (const win of BrowserWindow.getAllWindows()) win.webContents.send('vanta:stats', stats)
    }
  })
  ipcMain.handle('vanta:stats:current', () => acc.snapshot())
  statsScheduler.start()
```
- Update the returned `stop` to stop BOTH schedulers: `return { stop: () => { scheduler.stop(); statsScheduler.stop() } }`.

- [ ] **Step 7: Quality gate**
```bash
npx tsc -p tsconfig.node.json --noEmit && npm run lint && npm test
```
Expected: node tsc 0 (preload still pending — see note); lint 0; tests pass. If node tsc fails ONLY on `src/preload/index.ts` missing `stats`, that's expected (fixed next task) — report it.

- [ ] **Step 8: Commit**
```bash
git add src/main/agent/netstats.ts src/main/agent/netstats.test.ts src/main/agent/probes.ts src/main/agent/ipc.ts
git commit -m "feat: poll interface throughput and push vanta:stats; surface vendor on Device"
```

---

## Task 4: Preload — expose `window.vanta.stats`

**Files:** Modify `src/preload/index.ts`

- [ ] **Step 1: Add the `stats` API** to the existing `api` object (keep `ping` + `devices`):
```ts
  stats: {
    current: () => ipcRenderer.invoke('vanta:stats:current'),
    subscribe: (cb: (stats: NetStats) => void) => {
      const listener = (_e: unknown, stats: NetStats) => cb(stats)
      ipcRenderer.on('vanta:stats', listener)
      return () => ipcRenderer.removeListener('vanta:stats', listener)
    }
  }
```
Add `NetStats` to the `import type { ... } from '@shared/types'` line.

- [ ] **Step 2: Quality gate (now both projects must be clean)**
```bash
npx tsc -p tsconfig.node.json --noEmit && npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: all 0.

- [ ] **Step 3: Commit**
```bash
git add src/preload/index.ts
git commit -m "feat: expose window.vanta.stats (current + subscribe) in preload"
```

---

## Task 5: Renderer hooks — `useTopology` + `useNetStats`

**Files:** Create `src/renderer/src/hooks/useTopology.ts`; `src/renderer/src/hooks/useNetStats.ts` + `useNetStats.test.tsx`

- [ ] **Step 1: Create `src/renderer/src/hooks/useTopology.ts`** (derives from the existing devices hook):
```ts
import { useMemo } from 'react'
import { useDevices } from './useDevices'
import { buildTopology } from '../topology'
import type { TopologyGraph } from '@shared/types'

export function useTopology(): { graph: TopologyGraph; loading: boolean } {
  const { devices, loading } = useDevices()
  const graph = useMemo(() => buildTopology(devices), [devices])
  return { graph, loading }
}
```

- [ ] **Step 2: Write the failing test** — `src/renderer/src/hooks/useNetStats.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useNetStats } from './useNetStats'
import type { NetStats } from '@shared/types'

const s = (rx: number): NetStats => ({ rxMbps: rx, txMbps: 1, rxHistory: [rx], txHistory: [1] })

describe('useNetStats', () => {
  beforeEach(() => {
    let cb: ((x: NetStats) => void) | null = null
    ;(window as unknown as { vanta: unknown }).vanta = {
      ping: vi.fn(),
      devices: { list: vi.fn().mockResolvedValue([]), subscribe: () => () => {} },
      stats: {
        current: vi.fn().mockResolvedValue(s(5)),
        subscribe: (fn: (x: NetStats) => void) => { cb = fn; return () => { cb = null } }
      }
    }
    ;(window as unknown as { __emitStats: (x: NetStats) => void }).__emitStats = (x) => cb?.(x)
  })

  it('loads current then applies live updates', async () => {
    const { result } = renderHook(() => useNetStats())
    await waitFor(() => expect(result.current.rxMbps).toBe(5))
    act(() => (window as unknown as { __emitStats: (x: NetStats) => void }).__emitStats(s(42)))
    expect(result.current.rxMbps).toBe(42)
  })
})
```

- [ ] **Step 3: Run to verify it fails** → module not found.

- [ ] **Step 4: Create `src/renderer/src/hooks/useNetStats.ts`**
```ts
import { useEffect, useState } from 'react'
import type { NetStats } from '@shared/types'

const EMPTY: NetStats = { rxMbps: 0, txMbps: 0, rxHistory: [], txHistory: [] }

export function useNetStats(): NetStats {
  const [stats, setStats] = useState<NetStats>(EMPTY)
  useEffect(() => {
    let mounted = true
    window.vanta.stats.current().then((s) => { if (mounted) setStats(s) })
    const unsubscribe = window.vanta.stats.subscribe((s) => { if (mounted) setStats(s) })
    return () => { mounted = false; unsubscribe() }
  }, [])
  return stats
}
```

- [ ] **Step 5: Run to verify it passes** → PASS (1).

- [ ] **Step 6: Quality gate**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: 0 / 0.

- [ ] **Step 7: Commit**
```bash
git add src/renderer/src/hooks/useTopology.ts src/renderer/src/hooks/useNetStats.ts src/renderer/src/hooks/useNetStats.test.tsx
git commit -m "feat: add useTopology and useNetStats hooks"
```

---

## Task 6: Wire `NetworkView` to live data

**Files:** Modify `src/renderer/src/views/NetworkView.tsx`. Read it fully first; preserve ALL markup/classes/styles — only swap data sources.

- [ ] **Step 1: Replace the data sources.**
- Remove `import { NETWORK_NODES, NETWORK_EDGES } from '../data'`. Add:
  ```ts
  import { useTopology } from '../hooks/useTopology'
  import { useNetStats } from '../hooks/useNetStats'
  import { useDevices } from '../hooks/useDevices'
  ```
- At the top of the component, replace the static references with:
  ```ts
  const { graph } = useTopology()
  const { devices } = useDevices()
  const stats = useNetStats()
  const NODES = graph.nodes
  const EDGES = graph.edges
  const [selected, setSelected] = useState<string | null>(null)
  const sel = NODES.find((n) => n.id === selected) ?? NODES[0] ?? null
  ```
- Throughout the JSX, replace `NETWORK_NODES` → `NODES` and `NETWORK_EDGES` → `EDGES`.
- In the edges `.map`, the existing `A`/`B` lookups use `.find(...)!`. Since nodes/edges now both come from `buildTopology` (edges only reference existing node ids), keep them but guard defensively: `const A = NODES.find(n => n.id === a); const B = NODES.find(n => n.id === b); if (!A || !B) return null;` then use `A`/`B` (no `!`). This satisfies strict TS without `!` and is crash-proof.
- The node `.map` `onClick={() => setSelected(n.id)}` stays.

- [ ] **Step 2: Stat cards from live data.** The four `.stat` cards currently show static numbers + sparklines. Replace with:
  - Card 1 "Devices": number = `devices.length`. Sparkline data: `stats.rxHistory.length ? stats.rxHistory : [0]` is unrelated — instead pass a small constant series or `[devices.length]`; simplest: keep the existing `<Sparkline>` but feed it `stats.rxHistory` only on the Ingress card. For the Devices card use `data={[devices.length]}` (flat line) to avoid fabricated trends.
  - Card 2 "Ingress": number = `stats.rxMbps` with the ` Mb/s` suffix; `<Sparkline data={stats.rxHistory.length ? stats.rxHistory : [0]} color="var(--blue)"/>`.
  - Card 3 "Egress": number = `stats.txMbps` ` Mb/s`; `<Sparkline data={stats.txHistory.length ? stats.txHistory : [0]} color="var(--amber)"/>`.
  - Card 4 "Anomalies": number = `devices.filter(d => !d.online).length`; keep its sparkline as `data={[0]}` for now (no anomaly history yet).
  - Keep each card's `trend` line markup but make it static/neutral if its value referenced removed data — do NOT fabricate "+2 this week" style deltas against data we don't have; if a trend line can't be backed by real data, render its label without a fake number, keeping the element/classes.
- The topology card sub `{NETWORK_NODES.length} nodes · {NETWORK_EDGES.length} edges` → `{NODES.length} nodes · {EDGES.length} edges`.

- [ ] **Step 3: Node detail panel — real fields.** The detail panel currently shows static Status/Latency/Throughput/Open-ports for `sel`. Replace with the live host. Find the selected device by mac: `const selDevice = devices.find(d => d.mac === sel?.id) ?? null`. Render:
  - Title/meta: `sel?.label` / `sel?.meta` (guard when `sel` is null → render the panel empty-state `<div className="card-sub">Select a node</div>` while keeping the card shell).
  - `Status` → `sel ? sel.state.toUpperCase() : '—'` with the existing `v ok/warn/bad` class derived from `sel?.state`.
  - Replace the `Latency` row value with `Reachability` → `selDevice?.online ? 'Online' : 'Offline'`.
  - Replace the `Throughput` row value with `Vendor` → `selDevice?.vendor ?? '—'`.
  - Replace the `Open ports` row value with `Type` → `selDevice?.type ?? '—'`.
  (Keep the `kv`/`kv-list` markup + classes; only the labels/values for those three rows change, since per-host latency/throughput/ports aren't available yet.)

- [ ] **Step 4: Loading/empty state.** If `graph.nodes.length === 0`, inside the topology `.map` area render nothing (the empty map grid still shows); add a `<div className="map-info">Scanning your network…</div>` when `useTopology().loading`, else `{EDGES.length} paths` as before.

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: 0 / 0. Fix only genuine type/lint issues with minimal changes; never fabricate data or alter unrelated markup.

- [ ] **Step 6: Commit**
```bash
git add src/renderer/src/views/NetworkView.tsx
git commit -m "feat: wire Network topology, stat cards, and node detail to live data"
```

---

## Task 7: Fix the views test for NetworkView

**Files:** Modify `src/renderer/src/views/views.test.tsx`

- [ ] **Step 1:** `NetworkView` now reads `window.vanta` (devices + stats). Extend the existing `beforeEach` `window.vanta` stub in this file to also include `stats`:
```ts
  ;(window as unknown as { vanta: unknown }).vanta = {
    ping: () => Promise.resolve('pong'),
    devices: { list: () => Promise.resolve([]), subscribe: () => () => {} },
    stats: { current: () => Promise.resolve({ rxMbps: 0, txMbps: 0, rxHistory: [], txHistory: [] }), subscribe: () => () => {} }
  }
```
Keep the existing Network test assertion `expect(screen.getByText('Network Topology')).toBeInTheDocument()` (the card title always renders).

- [ ] **Step 2: Run the full suite**
Run: `npm test`
Expected: all tests pass (Network renders with the empty stub).

- [ ] **Step 3: Commit**
```bash
git add src/renderer/src/views/views.test.tsx
git commit -m "test: stub window.vanta.stats for NetworkView render test"
```

---

## Task 8: QA gate (automated + boot + manual)

- [ ] **Step 1: Full automated gate**
```bash
npm run lint && npm run typecheck && npm test && npm run build && npm audit
```
Expected: lint 0; typecheck 0; all tests pass; build succeeds; **0 vulnerabilities**.

- [ ] **Step 2: Electron boot smoke test** (catches ESM/CJS or runtime issues the gate misses). Launch the built app, let a discovery + a couple stats sweeps run, capture startup logs, kill by exact PID (never `pkill` by name — it could kill other Electron apps):
```bash
(./node_modules/.bin/electron . >/tmp/vanta_p3_smoke.log 2>&1 & echo $! >/tmp/vanta_p3_epid); sleep 10
EPID=$(cat /tmp/vanta_p3_epid); kill "$EPID" 2>/dev/null; sleep 1; ps -p "$EPID" >/dev/null 2>&1 && kill -9 "$EPID" 2>/dev/null
grep -iE "error|exception|cannot|failed|throw|ERR_|threw|not a function" /tmp/vanta_p3_smoke.log | grep -viE "IMKClient|IMKInputSession|Secure coding|CoreText|objc\[|DevTools|ViewBridge|TIPapp|GPU stall|stalls" | head -20 || echo "clean boot"
```
Expected: no real errors (clean boot).

- [ ] **Step 3: Manual run (controller hands to user — needs a real LAN).** `npm run dev`, open the **Network** tab: confirm the gateway shows at the centre with hosts radiating out, clicking a node populates the detail panel with that host's real status/IP/MAC/vendor/type, the Devices/Anomalies counts match reality, and Ingress/Egress move when you generate traffic.

- [ ] **Step 4: Commit any fixes**
```bash
git add -A && git commit -m "fix: address issues found during Phase 3 verification"
```
(Skip if none.)

---

## Self-Review

- **Spec coverage (Phase 3):** topology from real hosts (Tasks 2, 6) ✓; gateway-rooted radial layout + star edges (Task 2) ✓; live node states presence-based, red deferred (Task 2, documented) ✓; node detail from real host (Task 6) ✓; Ingress/Egress as honest this-host throughput (Tasks 1,3,4,5,6) ✓; Devices/Anomalies from live data (Task 6) ✓; 99% fidelity preserved (Task 6) ✓; dangling-edge guard added (Task 6 Step 1) ✓.
- **Placeholder scan:** none — every step has concrete code/edits. Trend-line deltas are explicitly NOT fabricated (Task 6 Step 2).
- **Type/name consistency:** `NetStats`, `Device.vendor`, and the extended `VantaBridge.stats` are defined in Task 1 and used identically in `ipc`/`preload`/`useNetStats`/`NetworkView`. `buildTopology` output (`TopologyGraph` with `NetworkNode`/`NetworkEdge`) matches the shared types and what `NetworkView` consumes. IPC channels `vanta:stats` (event) + `vanta:stats:current` (invoke) match across `ipc.ts` and `preload`.

---

## Next phases (separate plans)
4. **Vulnerabilities** — `portscan` (pure-Node TCP connect + progressive `nmap`/`vulners`) → real CVEs in the Vulnerabilities tab + open-ports in the node detail; enables `warn`/`red` risk states.
5. **Threats** — rule engine over scan deltas/findings (introduces durable SQLite `Store`); real Anomalies feed.
6. **Dashboard wiring + packaging** — health score, host metrics, forecast baseline; `electron-builder` installers; local fonts + CSP (Phase 1 review follow-ups).
