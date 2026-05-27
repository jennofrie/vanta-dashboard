# Project Guide — VANTA

Instructions for any AI coding agent working in this repository. Keep this file
concise; it is loaded into context on every session.

## What this is

VANTA is a cross-platform **Electron** desktop app that monitors the user's **own**
local network: device discovery, vulnerability scanning, live topology, and a
classified threat feed. The UI is a fixed design that must be reproduced at **99%
visual fidelity** — do not redesign it.

## Commands

```bash
npm install      # dependencies
npm run dev      # run app with HMR
npm run build    # type-check + build
npm run lint     # eslint
npm test         # unit/integration tests
npm run package  # build distributable (electron-builder)
```

## Architecture (read before editing)

Two-process Electron app. Full detail in [ARCHITECTURE.md](./ARCHITECTURE.md) and the
design spec under `docs/superpowers/specs/`.

- `src/renderer/` — React UI. **Pure presentation. Never access the network here.**
  It talks to the agent only through `window.vanta.*`.
- `src/preload/` — the typed `contextBridge` API surface. The only bridge between
  renderer and main.
- `src/main/` — the privileged **Agent**: `discovery`, `vendor`, `portscan`, `vulns`,
  `topology`, `threats`, `scheduler`, `store`, `ipc`. Each module is single-purpose
  and independently testable.
- `src/shared/` — TS interfaces shared across processes (`Host`, `Port`, `Vuln`,
  `ThreatEvent`, `TopologyGraph`, IPC contracts).

## Conventions

- **TypeScript** throughout. Prefer real types; avoid `any` unless truly necessary.
- **React:** functional components + hooks, ES modules.
- **Module boundaries:** agent logic stays in `src/main`; never import Node/network
  APIs into the renderer. Cross-process data must use a `src/shared` type.
- **Visual fidelity:** preserve the original CSS (including `oklch` values) verbatim.
  When a UI value can't be obtained for real, substitute an honest real value behind
  the same visual element — never fake data. See the spec's "honest substitutions".
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- **Tests:** the parsers, classifiers, topology layout, threat rules, and scoring are
  pure functions — cover them with fixture-driven unit tests.

## Security rules (non-negotiable)

- Scan **only** the local subnet of the active interface. Never scan internet hosts or
  anything beyond the LAN.
- Run unprivileged by default; request elevation only for opt-in deep nmap scans.
- No telemetry, no cloud calls, no data exfiltration. Everything stays local.
- Keep the renderer sandboxed: `contextIsolation: true`, `nodeIntegration: false`.

## Status

Pre-implementation. Design spec is complete and approved; the repo is migrating from
the Vite scaffold to the Electron layout. Check [CHANGELOG.md](./CHANGELOG.md).

---

Created and maintained by **JD Digital Systems**.
