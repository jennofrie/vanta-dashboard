# VANTA — Local Network Security Monitor

> A cross-platform desktop application that discovers the devices on your own local
> network, scans them for vulnerabilities, maps your topology, and classifies network
> activity into a live threat feed.

**Status:** 🟡 In development — design phase complete, implementation in progress.
See [CHANGELOG.md](./CHANGELOG.md) for the current state.

---

## Overview

VANTA is a security-operations dashboard for your **own** LAN. It runs entirely
locally — no cloud, no telemetry, no data leaves your machine. A privileged local
agent (the Electron main process) performs the network work; a sandboxed React UI
renders it.

It is built around four working views plus a dashboard:

| View | What it shows |
|------|---------------|
| **Dashboard** | Composite health score, host metrics, top-risk systems, threat-trend chart |
| **Devices** | Every device discovered on your network, classified by type |
| **Network** | Live topology — your gateway at the core, hosts radiating out |
| **Vulnerabilities** | Per-host CVEs with CVSS scores and patch guidance |
| **Threats** | A classified, real-time event feed of notable network activity |

---

## Tech stack

- **Desktop shell:** Electron + [`electron-vite`](https://electron-vite.org) + `electron-builder`
- **UI (renderer):** React 19 · TypeScript · Vite
- **Agent (main process):** TypeScript/Node — `systeminformation`, ARP/mDNS discovery,
  `better-sqlite3`, optional `nmap` integration
- **IPC:** typed `contextBridge` API (`window.vanta.*`), renderer fully sandboxed

For the full architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md) and the design
spec in [`docs/superpowers/specs/`](./docs/superpowers/specs/).

---

## Getting started

> Requires Node.js 20+ and npm. Optional: `nmap` on `PATH` unlocks deep
> service/version + CVE scanning (the app works without it at reduced depth).

```bash
npm install      # install dependencies
npm run dev      # run the app in development (HMR)
npm run build    # type-check and build
npm run package  # produce a distributable installer (once Electron is wired)
```

---

## Project structure

```
vanta-dashboard/
├─ src/
│  ├─ renderer/     # React UI (the VANTA dashboard)
│  ├─ main/         # Electron main process — the network Agent
│  ├─ preload/      # typed contextBridge API surface
│  └─ shared/       # TS types shared across processes (Host, Vuln, ThreatEvent…)
├─ docs/
│  └─ superpowers/specs/   # design specifications
├─ ARCHITECTURE.md
├─ CONTRIBUTING.md
├─ SECURITY.md
└─ CHANGELOG.md
```

> Note: the `src/` layout above is the target structure. The repository currently
> holds the Vite scaffold and is mid-migration to the Electron layout.

---

## Security & responsible use

VANTA only scans the **local subnet of your active network interface** and never
reaches beyond it. Use it only on networks you own or are explicitly authorized to
monitor. See [SECURITY.md](./SECURITY.md) for the full policy.

---

## License

Proprietary. © 2026 **JD Digital Systems**. All rights reserved.

---

Created and maintained by **JD Digital Systems**.
