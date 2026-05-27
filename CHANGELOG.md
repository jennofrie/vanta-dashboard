# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The project is in its design-and-scaffolding phase. No application functionality is
wired up yet.

### Added
- Project scaffold: Vite + React 19 + TypeScript.
- Approved design specification for the local network security monitor
  (`docs/superpowers/specs/2026-05-27-vanta-network-monitor-design.md`).
- Project documentation: `README`, `CLAUDE.md`, `ARCHITECTURE`, `CONTRIBUTING`,
  `SECURITY`, and this changelog.

### Planned (next)
- Migrate the scaffold to the Electron two-process layout
  (`renderer` / `preload` / `main` / `shared`).
- Port the VANTA dashboard UI from the prototype at 99% visual fidelity.
- Build the agent core (`discovery`, `store`, `ipc`, `scheduler`) → live **Devices**.
- Wire **Network topology**, **Vulnerabilities**, then **Threats** (priority).
- Wire the **Dashboard** and produce cross-platform installers.

---

Maintained by **JD Digital Systems**.
