# VANTA — Local Network Security Monitor

**Design spec** · 2026-05-27
**Status:** approved (pending written-spec review)

---

## 1. Summary

VANTA is a cross-platform **Electron desktop application** that turns the existing
"Security Dashboard" UI prototype into a *working* local-network security monitor. It discovers the devices on the user's own LAN, scans them for
vulnerabilities, builds a live network topology, and classifies observable network
events into a threat feed.

The visual design is **locked at 99% fidelity** to the original prototype. This spec
is about wiring real data behind that unchanged UI.

### Goals
- Real device discovery on the local subnet → **Devices** tab + **Topology**.
- Real vulnerability detection per host → **Vulnerabilities** tab.
- A live, classified event stream → **Threats** tab (the priority feature).
- A composite dashboard tying it together → **Dashboard** tab.
- Cross-platform (macOS / Windows / Linux), single installable GUI.

### Non-goals (v1)
- No trained ML/AI model (the "AI Threat Forecast" is backed by honest statistics).
- No remote/cloud component; everything runs locally.
- No scanning beyond the user's own local subnet.
- No active exploitation — detection and classification only.

---

## 2. Architecture

A two-process Electron app following Electron security best practice
(`contextIsolation: true`, `nodeIntegration: false`, sandboxed renderer).

```
┌──────────────────────────────────────────────────────────────┐
│ Renderer  (Vite + React 19 + TS)                               │
│   The VANTA dashboard UI — ported 1:1 from the prototype.      │
│   Pure presentation. No network access.                        │
│        │  calls window.vanta.* only                            │
│        ▼                                                        │
│ Preload bridge  (typed, minimal surface)                       │
│   window.vanta.devices.list() / scan.run() / onEvent(cb) / …   │
└────────┬───────────────────────────────────────────────────────┘
         │  contextBridge + typed IPC
┌────────▼───────────────────────────────────────────────────────┐
│ Main process  ("the Agent" — all TypeScript/Node, privileged)   │
│                                                                  │
│   scheduler ── discovery ── vendor                               │
│      │            │                                              │
│      │            ├── portscan ── vulns                          │
│      │            └── topology                                   │
│      │                                                           │
│      └──────────► threats (rule engine) ──► store (SQLite)       │
│                          │                       │               │
│                          └────► IPC push ◄───────┘               │
└──────────────────────────────────────────────────────────────────┘
```

### Agent modules (each single-purpose, independently testable)

| Module | Responsibility | Key inputs → outputs |
|--------|----------------|----------------------|
| `discovery` | Enumerate live hosts | ARP table + ping sweep + mDNS → `Host[]` |
| `vendor` | MAC → manufacturer | MAC prefix → vendor string (offline OUI table) |
| `portscan` | Open-port detection | host → `Port[]` (pure-Node TCP connect; nmap deep if present) |
| `vulns` | Service → CVE mapping | `Port[]`/service-version → `Vuln[]` (nmap `vulners`, else heuristic) |
| `topology` | Build the network graph | `Host[]` + gateway → `{nodes, edges}` (radial layout) |
| `threats` | Classify events | scan results + deltas → `ThreatEvent[]` (severity-tagged) |
| `scheduler` | Tiered cadence orchestration | timers → triggers discovery/scan passes |
| `store` | Persistence + history | SQLite: hosts, scans, ports, vulns, events |
| `ipc` | Typed channel registration | request/response + event subscriptions |

### Data flow
1. `scheduler` fires a **cheap sweep** (~30–60s): `discovery` enumerates hosts.
2. Results are **diffed** against `store` to compute deltas (new host, host gone,
   port changes, gateway/DNS change).
3. Deltas + latest findings feed the `threats` rule engine → `ThreatEvent[]`.
4. Events are **persisted** to `store` **and pushed** to the renderer via an IPC
   subscription → the Threats/Devices/Topology tabs update live.
5. A **deep scan** (hourly, or on-demand via the design's "Run Scan" button) runs
   `portscan` + `vulns` and updates the Vulnerabilities tab + per-host risk.

---

## 3. Per-tab data wiring

The original data shapes (`SYSTEMS`, `DEVICES`, `VULNS`, `THREATS_FEED`,
`NETWORK_NODES/EDGES`, `FORECAST`) are preserved. Each field below maps to a real
source. Six fields are **honest substitutions** (marked ⚠️) where the mock value is
physically unobtainable on a LAN — visuals stay pixel-identical, the number behind it
is real.

### 3.1 Devices
- `name` ← hostname via mDNS / reverse-DNS; fallback `"<Vendor> ·<last-octet>"`.
- `type` / `role` / `ico` ← classification from mDNS service types + open ports +
  vendor, mapped to the **existing icon set** (router, camera, tv, phone, speaker,
  watch, server, cloud…). Unknown → generic icon.
- `mac` ← ARP. `ip` ← discovery. `online` ← presence (recent ARP / ping reply).
- ⚠️ `signal %` → **reachability/latency score**. Per-device Wi-Fi RSSI is not
  obtainable for remote hosts. Rendered behind the same wifi-icon chip.
- Stat cards (total / online / offline / awaiting-pair) → real counts;
  "awaiting pair" → **unclassified/unknown** host count.

### 3.2 Network topology
- Core node = the **default gateway** (router). Discovered hosts radiate out via a
  **computed radial layout** (angle by index, radius by role/risk tier) — preserves
  the hub-and-spoke look since real hosts have no hand-authored coordinates.
- Default edges = star (host → gateway), accurate for typical home/office LANs.
- `state` (ok / warn / red) ← per-host risk (risky ports, CVEs, anomalies).
- Stat cards: Devices = real count; Anomalies = live high-severity event count.
- ⚠️ `Ingress` / `Egress Mb/s` → **this host's interface counters**
  (`systeminformation`). Whole-LAN throughput is not observable from one host.

### 3.3 Vulnerabilities
- Deep path: `nmap -sV` → service/version → `vulners` script → CVE list.
  - `id` = CVE, `score` = CVSS, `severity` = derived from CVSS band,
    `system` = host, `title` = summary, `age` = first-detected age.
- Shallow path (no nmap): heuristic from open risky ports + known-service advisories.
- Severity stat cards → real counts by band.
- ⚠️ `patch` column → `Available` / `Unknown`, derived from detected version vs
  known-fixed version. Whether a patch is *applied* is generally undetectable remotely.

### 3.4 Threats (priority)
Rule engine over observable signals; each event tagged `Critical/High/Med/Low` and
rendered in the existing feed format `{ sev, source, title, desc, time, region }`.

| Signal (evidence) | Severity |
|-------------------|----------|
| Unknown device joins the LAN | Med (High if it exposes risky ports) |
| Risky/admin port exposed (23 telnet, 3389 RDP, 445 SMB, 5900 VNC, open 22) | High / Med |
| Host has a Critical/High CVE | = CVE severity |
| New open port appeared since last scan | Med / High |
| Default gateway or DNS server changed (possible MITM) | High |
| Port-scan-like / connection-spike behavior from a host | High |
| Device offline / flapping | Low / Med |

- `source` = host/IP. `desc` = the evidence (mono text, e.g. `ssh:22 · 12 attempts`).
- `time` = relative ("2 min ago") from event timestamp in `store`.
- ⚠️ `region` column → **zone** (Gateway / LAN / IoT / device-class). No geolocation
  exists on a LAN. Same column, real grouping.

### 3.5 Dashboard
- **Health gauge** = composite security score: `100 − weighted penalties`
  (risky ports, CVEs by severity, active anomalies).
- **CPU / RAM / Disk** = real, via `systeminformation` (this host).
- **Connected Systems** table = top hosts by risk, mapped to the `SYSTEMS` shape
  (`connector` = device class, `workload` = hostname, `score` = per-host security
  score, `threats` = band, `patches` = pending-vuln count).
- ⚠️ **"AI Threat Forecast"** chart → `actual` = real daily event counts from
  `store`; `predicted` = **moving-average baseline**; `conf` = inverse of recent
  variance. Honest statistics, not a trained model. Label/visual unchanged; a real
  model can be swapped in later.

---

## 4. Tech stack

- **Shell:** Electron (latest stable), `electron-vite` (renderer HMR + main/preload
  bundling), `electron-builder` (dmg / nsis / AppImage).
- **Renderer:** the existing Vite + React 19 + TypeScript scaffold at project root,
  with the VANTA CSS/components ported from the prototype.
- **Main/agent (TypeScript):**
  - `systeminformation` — host metrics, interfaces, default gateway, interface stats.
  - `local-devices` (or direct `arp -a` parse) — ARP-based discovery.
  - `bonjour-service` / mDNS — hostname + service-type classification.
  - `better-sqlite3` — synchronous embedded store.
  - MAC OUI lookup — bundled offline OUI dataset.
  - `nmap` (optional, detected at runtime) via `child_process` — deep scan + vulners.
  - Pure-Node TCP connect scan (`net`) for the no-nmap path.
- **Shared types:** a `src/shared/` dir of TS interfaces (`Host`, `Port`, `Vuln`,
  `ThreatEvent`, `TopologyGraph`, IPC contracts) imported by both processes.

---

## 5. Security & safety

- **Scope lock:** the Agent computes the active interface's subnet from the host's own
  IP + netmask and **only scans that subnet**. Never internet hosts, never beyond the
  LAN. This is the user's own network → authorized self-monitoring.
- **Least privilege:** runs unprivileged by default. Privilege escalation (sudo) is
  requested **only** when the user opts into deep nmap scans that require it.
- **Renderer isolation:** `contextIsolation` on, `nodeIntegration` off, sandboxed; the
  renderer reaches the agent only through the minimal typed preload bridge.
- **No exfiltration:** no telemetry, no cloud calls; all data stays in the local store.

---

## 6. Testing approach

- **Unit (pure functions, fixture-driven):** ARP/mDNS parsers, MAC→vendor lookup,
  device classifier, topology radial-layout, threat rule engine, security-score
  calculation, forecast baseline. These are deterministic and the bulk of the logic.
- **Integration:** run the agent pipeline against a **mock host set** (no live
  network) to verify discovery→diff→classify→persist→push.
- **Renderer:** component render checks for each view against sample data shaped like
  the real IPC payloads.

---

## 7. Build order

1. **Agent core** — `discovery` + `store` + `ipc` + `scheduler` skeleton → **Devices**
   tab goes live with real hosts.
2. **Topology** — reuses discovery + classification + radial layout.
3. **Vulnerabilities** — `portscan` + `vulns` (progressive nmap).
4. **Threats** — rule engine over deltas/findings (the priority; needs 1–3 as inputs).
5. **Dashboard** — health score, host metrics, connected systems, forecast baseline.
6. **Packaging** — `electron-builder` cross-platform installers.

---

## 8. Open items / future
- Swap the statistical forecast for a real anomaly-detection model.
- Optional passive traffic inspection (pcap/Zeek/Suricata) for richer threat signals.
- Per-host detail drill-downs beyond the current node panel.
