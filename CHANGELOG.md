# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Phase 6: Dashboard wiring + packaging (complete)
- **Dashboard** fully live: composite health score (0–100 from vuln penalties + active
  threats) drives the animated gauge; **Threat Trend** chart backed by a 15-day rolling
  event-count baseline (renamed from "AI Threat Forecast" — honest, no ML model);
  Connected Systems table from real discovered devices + scan findings; network metrics
  (RX/TX Mb/s + device count); live insight callout.
- **Vendored fonts** — Space Grotesk + JetBrains Mono bundled via `@fontsource`; the
  Google Fonts `<link>` is removed. Dashboard renders correctly **offline**.
- **Renderer CSP** — `Content-Security-Policy` meta tag (`self`-only, `unsafe-inline`
  for inline styles). Closes the last open security gap in the renderer sandbox.
- **electron-builder** — `electron-builder.yml` configured for `.dmg` (macOS arm64 +
  x64), `.nsis`/`.exe` (Windows x64/ia32), `.AppImage` (Linux x64). First successful
  packaging run: `VANTA-0.1.0-arm64.dmg` (115 MB) + `VANTA-0.1.0.dmg` (123 MB),
  auto-signed with Apple Developer certificate. App is now a distributable installer.
- Quality: lint + typecheck clean, 75 tests passing, build + Electron boot verified.

### Added — Phase 5: Threats rule engine + persistent store (complete)
- Pure, DI-testable threat rule engine (`applyRules`) with 5 rules: **NEW_DEVICE**,
  **DEVICE_OFFLINE**, **RISKY_EXPOSURE** (new exposure finding), **NEW_OPEN_PORT**,
  **GATEWAY_CHANGE**. Fires on every discovery cycle and on-demand scan completion.
- `JsonFileStore` — JSON-backed persistent store (`userData/vanta-state.json`) that
  survives app restarts; implements the `Store` interface (host state, delta snapshots,
  threat events, last gateway IP). Replaces `InMemoryStore` in the agent. SQLite
  (`better-sqlite3`) deferred: cannot compile for Electron 42 / Node 24.15.0 (V8 ext
  API change; upstream PR #1475 pending merge). `JsonFileStore` will be swapped for
  `SqliteStore` when the fix lands with zero consumer changes.
- `vanta:threats` IPC: push channel + `vanta:threats:current` on-demand handler.
  `useThreats` hook; live **Threats** tab feed; real **Anomalies** count on the Network
  tab (Critical + High active events, replacing the offline-count placeholder).
- Quality: lint + typecheck + 69 tests + build + 0 vulns + Electron boot verified.

### Added — Phase 4: Vulnerabilities — port scan + findings (complete)
- On-demand vulnerability scan (the Vulnerabilities tab's **Run Scan** button): a
  concurrency-limited pure-Node TCP **connect** scan over discovered hosts, enriched
  with `nmap -sV` service/version detection when nmap is on PATH. Bounded common-port
  list, connect-scan only, no privilege — safe self-assessment on your own LAN.
- **Local-only by design** (per decision): no `nmap --script vulners`, no online
  lookups, nothing leaves your machine. Findings are honest **port-exposure** entries
  (`EXPOSURE-<port>`, severity from a curated port-risk table) — never fabricated CVE
  ids. Real CVE-IDs are deferred to a future offline CVE-DB phase.
- Vulnerabilities tab wired to live findings: computed severity stat cards, severity
  filter, sortable findings table, scanning/empty states, and an nmap-availability hint.
- Scan severity now drives the **topology** `warn`/`red` node states, and the Network
  node-detail panel shows each host's real **open ports** (the Phase 3 deferrals).
- `scan` IPC (`run`/`current`/`subscribe`) + `useScan` hook; pure, unit-tested engine
  (port scan, nmap parser, orchestrator, port-risk findings).
- Quality: lint + typecheck clean, 56 tests passing, build + Electron boot verified;
  real `nmap -sV` output confirmed to match the parser.

### Added — Phase 3: Network topology from real hosts (complete)
- Live **Network** tab: a gateway-rooted radial topology built from the real device
  stream via a pure `buildTopology()` (gateway centre, hosts on a ring, star edges,
  presence-based node state — `ok` online / `warn` offline; risk-driven `red` deferred
  to later phases). Clickable nodes populate a detail panel with real fields
  (Status / Reachability / Vendor / Type); per-host latency + open ports come later.
- Interface throughput: a `stats` IPC backed by `systeminformation.networkStats()`
  (this host's interface — honest substitution) with a rolling history; drives the
  live Ingress/Egress cards + sparklines. Devices/Anomalies cards from the live list.
- Replaced the prototype's fabricated stat-card trend deltas with honest descriptors.
- `useTopology` + `useNetStats` hooks; `Device.vendor` surfaced over IPC.
- Quality: lint + typecheck clean, 44 tests passing, build + Electron boot verified.

### Added — Phase 2: Agent core & live Devices (complete)
- Privileged discovery agent in the Electron main process (`src/main/agent/`), built
  as small single-purpose, dependency-injected modules: `subnet` (CIDR + bounded /24
  host enumeration), `vendor` (offline MAC→manufacturer via `oui-data`), `classify`
  (service/vendor/hostname → device class + icon), `store` (`Store` interface +
  `InMemoryStore`, swappable for SQLite later), `discovery` (merges ARP + mDNS +
  vendor + classification), `scheduler` (non-overlapping ~45s sweep), `probes` (OS
  `arp` table parse + `systeminformation` gateway + `bonjour-service` mDNS), and `ipc`.
- Typed IPC: `window.vanta.devices.list()` + a live `vanta:devices` push stream; the
  **Devices** tab now shows real LAN devices (name/type/vendor/IP/MAC/online), keyed by
  MAC, with loading/empty states. Honest substitutions per spec (`signal` = reachability).
- Unprivileged + local-only by design; avoided `local-devices` (its `ip`/`get-ip-range`/
  `ip-address` chain carried high-severity advisories). **0 vulnerabilities.**
- Quality: lint + typecheck clean, 37 tests passing, build + Electron boot verified.

### Added — Phase 1: Electron foundation & UI port (complete)
- Migrated the scaffold to the Electron two-process layout
  (`src/main` / `src/preload` / `src/renderer` / `src/shared`) via `electron-vite`.
- Electron main process with a single sandboxed window
  (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`) and a typed
  `contextBridge` preload exposing `window.vanta` (emitted as CommonJS `.cjs`).
- Shared domain + IPC types in `src/shared` (`Device`, `Vuln`, `ThreatEvent`,
  `SystemRow`, `ForecastPoint`, `NetworkNode/Edge`, `TopologyGraph`, `VantaBridge`).
- Ported the VANTA dashboard UI from the prototype at verbatim/99% fidelity: global
  stylesheet, `Icon`, charts (gauge, threat-forecast, sparkline, radar), all six views
  (Dashboard, Network, Vulnerabilities, Devices, Threats, Alerts) + stub, and the app
  shell with working nav.
- Vitest + React Testing Library suite (20 tests) covering types, data, icons, charts,
  views, and app navigation. Build and both TypeScript projects type-check clean.

### Planned (next)
- Build the agent core (`discovery`, `store`, `ipc`, `scheduler`) → live **Devices**.
- Wire **Network topology**, **Vulnerabilities**, then **Threats** (priority).
- Wire the **Dashboard** and produce cross-platform installers.

### Earlier — design & scaffolding
- Project scaffold: Vite + React 19 + TypeScript.
- Approved design specification
  (`docs/superpowers/specs/2026-05-27-vanta-network-monitor-design.md`) and Phase 1
  implementation plan (`docs/superpowers/plans/`).
- Project documentation: `README`, `CLAUDE.md`, `ARCHITECTURE`, `CONTRIBUTING`,
  `SECURITY`, and this changelog.

---

Maintained by **JD Digital Systems**.
