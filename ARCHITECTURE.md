# Architecture

A high-level map of how VANTA is put together. For the full rationale and per-tab data
wiring, see the design spec in
[`docs/superpowers/specs/2026-05-27-vanta-network-monitor-design.md`](./docs/superpowers/specs/2026-05-27-vanta-network-monitor-design.md).

## Process model

VANTA is a two-process Electron application following Electron security best practice
(`contextIsolation: true`, `nodeIntegration: false`, sandboxed renderer).

```
┌──────────────────────────────────────────────────────────────┐
│ Renderer  (Vite + React 19 + TS)                               │
│   The VANTA dashboard UI. Pure presentation, no network.       │
│        │  calls window.vanta.* only                            │
│ Preload bridge  (typed, minimal contextBridge surface)         │
└────────┬───────────────────────────────────────────────────────┘
         │  typed IPC (request/response + event subscriptions)
┌────────▼───────────────────────────────────────────────────────┐
│ Main process  ("the Agent" — TypeScript/Node, privileged)       │
│   scheduler → discovery → vendor                                 │
│                  ├→ portscan → vulns                             │
│                  └→ topology                                     │
│   ... → threats (rule engine) → store (SQLite) → IPC push        │
└──────────────────────────────────────────────────────────────────┘
```

## Agent modules

| Module | Responsibility |
|--------|----------------|
| `discovery` | Enumerate live hosts (ARP table + ping sweep + mDNS) |
| `vendor` | MAC prefix → manufacturer (offline OUI table) |
| `portscan` | Open-port detection (pure-Node TCP connect; nmap deep scan if present) |
| `vulns` | Service/version → CVEs (nmap `vulners`, else heuristic) |
| `topology` | Build the graph: gateway core + hosts via radial layout |
| `threats` | Rule engine: scan results + deltas → classified events |
| `scheduler` | Tiered cadence: cheap sweep ~30–60s, deep scan hourly/on-demand |
| `store` | SQLite (`better-sqlite3`): hosts, scans, ports, vulns, events history |
| `ipc` | Typed channel registration + event push |

Each module has one clear purpose, communicates through typed interfaces in
`src/shared/`, and can be understood and tested independently.

## Data flow

1. `scheduler` triggers a cheap **discovery** sweep on an interval.
2. Results are **diffed** against `store` → deltas (new/lost host, port change,
   gateway/DNS change).
3. Deltas + findings feed the `threats` rule engine → `ThreatEvent[]`.
4. Events are **persisted** and **pushed** to the renderer via IPC subscription;
   the UI updates live.
5. A **deep scan** (hourly or via the "Run Scan" button) runs `portscan` + `vulns`
   and refreshes the Vulnerabilities tab and per-host risk.

## Persistence

`better-sqlite3` stores hosts, scans, ports, vulns, and the event log. History powers
deltas, sparklines, severity counts, and the dashboard threat-trend baseline.

## Security boundaries

- Renderer never touches Node or the network; it only sees `window.vanta.*`.
- The agent scans only the active interface's local subnet.
- Privilege escalation is opt-in (deep nmap scans only).
- No outbound network calls beyond the LAN scan; no telemetry.

---

Created and maintained by **JD Digital Systems**.
