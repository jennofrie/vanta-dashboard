# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
