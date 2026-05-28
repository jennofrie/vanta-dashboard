# Architecture

A high-level map of how VANTA is put together. For the full rationale and per-tab data
wiring, see the design spec in
[`docs/superpowers/specs/2026-05-27-vanta-network-monitor-design.md`](./docs/superpowers/specs/2026-05-27-vanta-network-monitor-design.md).

## Process model

VANTA is a two-process Electron application following Electron security best practice
(`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).

```
┌──────────────────────────────────────────────────────────────┐
│ Renderer  (Vite + React 19 + TS)                               │
│   The VANTA dashboard UI. Pure presentation, no network.       │
│   Hooks: useDevices, useTopology, useNetStats, useScan,        │
│          useThreats, useHealthScore, useForecast               │
│        │  calls window.vanta.* only                            │
│ Preload bridge  (typed, minimal contextBridge surface)         │
│   window.vanta.ping / devices / stats / scan / threats         │
└────────┬───────────────────────────────────────────────────────┘
         │  typed IPC (request/response + event push)
┌────────▼───────────────────────────────────────────────────────┐
│ Main process  ("the Agent" — TypeScript/Node, privileged)       │
│   scheduler(45s) → discovery → vendor → classify               │
│                  ↘ delta → rules → threats → IPC push           │
│   statsScheduler(3s) → netStats → IPC push                     │
│   doScan (on-demand) → portscan → nmap-sV → vulns → IPC push   │
│   store (JsonFileStore, userData/vanta-state.json)              │
└──────────────────────────────────────────────────────────────────┘
```

## Agent modules (`src/main/agent/`)

| Module | Responsibility |
|--------|----------------|
| `discovery` | ARP table parse + mDNS (bonjour) → `DiscoveredHost[]` |
| `vendor` | MAC OUI → manufacturer (offline `oui-data` JSON DB) |
| `classify` | hostname/services/vendor → `DeviceClass` + icon + role |
| `portscan` | Pure-Node TCP connect scan over `COMMON_PORTS` (24 ports, DI probe) |
| `nmap` | Parse `nmap -sV` normal output → `OpenPort[]` with service/version |
| `severity` | Port-risk curated table → `EXPOSURE-*` heuristic findings |
| `scan` | Orchestrate port scan + nmap version enrichment + findings (DI) |
| `rules` | Pure rule engine: 5 rules over discovery/scan deltas → `ThreatEvent[]` |
| `netstats` | Rolling RX/TX Mb/s accumulator for sparklines |
| `scheduler` | Non-overlapping interval scheduler (immediate first run) |
| `probes` | Real OS adapters: `arpScan`, `mdnsScan`, `tcpProbe`, `hasNmap`, `runNmap`, `netStats`, `getGatewayIp` |
| `jsonFileStore` | JSON-backed persistent store (`Store` interface; SQLite deferred — `better-sqlite3` pending Electron 42 V8 fix) |
| `ipc` | Bootstrap all schedulers, register IPC handlers, push events to renderer |

## Renderer pure functions (`src/renderer/src/`)

| Module | Responsibility |
|--------|----------------|
| `topology` | `buildTopology(devices, hostScans)` — radial layout, gateway centre, star edges, risk-based node states |
| `health` | `computeHealthScore(scan, threats)` — 0–100 composite score (vuln + threat penalties) |
| `forecast` | `buildForecast(events, now)` — 15-day rolling event-count baseline + moving-average predicted |

## Data flow

1. `scheduler` fires a cheap **discovery** sweep every ~45s.
2. Results are **diffed** against the `JsonFileStore` snapshot → `applyRules()` emits `ThreatEvent[]`.
3. `store.snapshotHosts()` saves current as "previous" for the next sweep's delta.
4. Events are **persisted** to `JsonFileStore` and **pushed** via `vanta:threats`; the Threats tab + Anomalies card update live.
5. A **`vanta:stats`** push (3s cadence) carries this-host interface throughput for the Network tab stat cards.
6. An **on-demand scan** (`doScan`) port-scans discovered hosts, enriches open ports with `nmap -sV` service/version (when nmap is installed, local-only — no online lookups), produces `EXPOSURE-*` findings from the port-risk table, pushes via `vanta:scan`.

## Persistence

`JsonFileStore` persists hosts, delta snapshots, threat events, and last-seen gateway IP to `{userData}/vanta-state.json`. State survives app restarts.

**SQLite (`better-sqlite3`) is deferred** — the native addon cannot compile for Electron 42 / Node 24.15.0 due to a V8 external-pointer API change (upstream PR #1475 open). `SqliteStore` will replace `JsonFileStore` via the same `Store` interface when the fix lands.

## IPC channels

| Channel | Direction | Content |
|---------|-----------|---------|
| `vanta:devices` | main → renderer | `Device[]` push after each sweep |
| `vanta:devices:list` | renderer → main | `Device[]` snapshot (invoke) |
| `vanta:stats` | main → renderer | `NetStats` push (3s) |
| `vanta:stats:current` | renderer → main | `NetStats` snapshot (invoke) |
| `vanta:scan` | main → renderer | `ScanResult` push after scan |
| `vanta:scan:run` | renderer → main | trigger on-demand scan (invoke) |
| `vanta:scan:current` | renderer → main | `ScanResult` snapshot (invoke) |
| `vanta:threats` | main → renderer | `ThreatsState` push on new events |
| `vanta:threats:current` | renderer → main | `ThreatsState` snapshot (invoke) |

## Security boundaries

- Renderer never touches Node or the network; it only sees `window.vanta.*`.
- The preload bridge is a CommonJS `.cjs` (required for `sandbox: true`).
- The agent scans only the active interface's local `/24` subnet.
- No elevation required; `nmap` prompts are opt-in only for deep scans.
- No outbound network calls from any layer; no telemetry; all data stays local.
- Renderer CSP: `default-src 'self'`, `connect-src 'none'`.

---

Created and maintained by **JD Digital Systems**.
