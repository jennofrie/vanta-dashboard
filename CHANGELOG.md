# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
