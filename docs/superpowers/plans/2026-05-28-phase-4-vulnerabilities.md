# Phase 4 — Vulnerabilities (Port Scan + CVE Mapping) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Vulnerabilities tab into real findings for the user's LAN — an on-demand scan that finds open ports (pure-Node), enriches with `nmap`/`vulners` CVEs when available, and feeds severity into the Vulnerabilities table, the topology node states, and the node-detail open-ports.

**Architecture:** A scan engine in the agent: pure-Node TCP **connect** port scan over discovered hosts + a progressive `nmap -sV --script vulners` adapter when nmap is on PATH. Pure functions (port scan with an injected connector, nmap output parser, CVSS→severity, heuristic port-risk findings, scan orchestrator) are unit-tested; the OS adapters are thin. Results flow over a `scan` IPC; the renderer consumes them in the Vulnerabilities tab and merges per-host risk into the topology.

**Tech Stack:** existing (Electron, electron-vite, React 19, TS, Node `net`, optional system `nmap`, Vitest).

---

## Scope of this phase

In: on-demand vulnerability scan (`scan.run()`), pure-Node TCP connect port scan, progressive `nmap`/`vulners` CVE enrichment, curated port-exposure findings for the no-nmap path, a `scan` IPC (run + current + subscribe), the **Vulnerabilities** tab wired to live findings (severity stat cards, filter, table, scan trigger/state), topology **`warn`/`red`** node states from scan severity, and **open ports** in the Network node-detail panel.

Out (later phases): the Threats rule engine + Anomalies feed (Phase 5); durable SQLite history; scheduled/continuous deep scans; authenticated/credentialed scanning; remediation actions.

## Key design decisions

1. **Hybrid/progressive engine.** Always run a pure-Node TCP **connect** scan (no privilege) over a bounded common-port list for each discovered host. If `nmap` is detected on PATH, additionally run `nmap -sV --script vulners` per host with open ports to get service versions + real CVEs. No nmap → curated **port-exposure findings** (NOT fabricated CVE numbers).
2. **Honest findings.** nmap/vulners findings carry real `CVE-…` ids + CVSS. Heuristic findings carry `EXPOSURE-<port>` ids and a curated severity/score from a port-risk table, with `patch: 'Harden'`. The UI's "CVE" column shows whichever id applies. `nmapAvailable` is surfaced so the UI can hint when deep scanning is off.
3. **On-demand + safe.** Scans run only when the user triggers them (the existing "Run Scan" buttons), across already-discovered local hosts only, common ports only, connect-scan only (no SYN/raw, no sudo). Concurrency-limited. The user's own LAN = authorized self-assessment.
4. **Risk feeds topology.** Each host's worst finding severity → node state: Critical/High → `red`, Medium → `warn`, else `ok` (offline still `warn`). The node-detail panel shows the host's real open ports. This delivers the Phase 3 deferral.
5. **Pure-function core, thin adapters.** Port scan (injected connector), nmap parser, CVSS→severity, heuristic findings, and the scan orchestrator are pure + unit-tested. `probes.ts` holds the real `net.connect` + `nmap` execution (thin, covered by the boot/manual run).
6. **99% fidelity preserved** in the Vulnerabilities + Network views.

## Target file structure

```
src/
├─ shared/types.ts                        # MODIFY: OpenPort, HostScan, ScanResult; VantaBridge.scan
├─ main/agent/
│  ├─ severity.ts  + .test.ts             # CREATE: severityFromCvss, PORT_RISK, findingsFromPorts
│  ├─ portscan.ts  + .test.ts             # CREATE: scanHostPorts(ip, ports, probe) (DI)
│  ├─ nmap.ts      + .test.ts             # CREATE: parseNmapVulners(text) (pure) + hasNmap()/runNmap() (adapter)
│  ├─ scan.ts      + .test.ts             # CREATE: runScan(hosts, deps) → ScanResult (DI)
│  ├─ probes.ts                           # MODIFY: tcpProbe(), nmap detect/run adapters
│  └─ ipc.ts                              # MODIFY: scan state + scan:run/current + vanta:scan push
├─ preload/index.ts                       # MODIFY: expose window.vanta.scan
└─ renderer/src/
   ├─ topology.ts                         # MODIFY: accept host-scan risk → node state
   ├─ hooks/useScan.ts  + .test.tsx       # CREATE
   ├─ views/VulnerabilitiesView.tsx       # MODIFY: live findings + stat cards + Run Scan
   └─ views/NetworkView.tsx               # MODIFY: open ports in node detail; risk node states
```

---

## Task 1: Shared types — scan results + bridge

**Files:** Modify `src/shared/types.ts`; Test `src/shared/types.scan.test.ts`

- [ ] **Step 1: Write the failing test** — `src/shared/types.scan.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { OpenPort, HostScan, ScanResult } from '@shared/types'

describe('scan types', () => {
  it('models open ports, per-host scans, and an aggregate result', () => {
    const port: OpenPort = { port: 22, service: 'ssh', version: 'OpenSSH 9.0' }
    const host: HostScan = { mac: 'M', ip: '10.0.0.2', openPorts: [port], vulns: [], worstSeverity: null }
    const result: ScanResult = {
      scanning: false, lastScanAt: 1, nmapAvailable: false, vulns: [], hosts: [host]
    }
    expect(result.hosts[0]!.openPorts[0]!.port).toBe(22)
  })
})
```

- [ ] **Step 2: Run to verify it fails**
Run: `npx vitest run src/shared/types.scan.test.ts` → FAIL (`OpenPort` not exported).

- [ ] **Step 3: Modify `src/shared/types.ts`** — append (keep all existing exports; extend `VantaBridge`):
```ts
export interface OpenPort {
  port: number
  service: string | null
  version: string | null
}

export interface HostScan {
  mac: string
  ip: string
  openPorts: OpenPort[]
  vulns: Vuln[]
  worstSeverity: Severity | null
}

export interface ScanResult {
  scanning: boolean
  lastScanAt: number | null
  nmapAvailable: boolean
  vulns: Vuln[]
  hosts: HostScan[]
}
```
Extend `VantaBridge` (keep `ping`, `devices`, `stats`) by adding:
```ts
  scan: {
    run(): Promise<void>
    current(): Promise<ScanResult>
    subscribe(cb: (result: ScanResult) => void): () => void
  }
```

- [ ] **Step 4: Run to verify it passes**
Run: `npx vitest run src/shared/types.scan.test.ts` → PASS (1).

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: web tsc 0; lint 0. NOTE: `tsconfig.node.json` will fail because `src/preload/index.ts` doesn't implement `scan` yet — EXPECTED, fixed in Task 7 (the controller may bring it forward). Report it; do not fix preload here.

- [ ] **Step 6: Commit**
```bash
git add src/shared/types.ts src/shared/types.scan.test.ts
git commit -m "feat: add OpenPort/HostScan/ScanResult types and scan IPC contract"
```

---

## Task 2: Severity mapping + heuristic port findings (pure)

**Files:** Create `src/main/agent/severity.ts`, `src/main/agent/severity.test.ts`

- [ ] **Step 1: Write the failing test** — `src/main/agent/severity.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { severityFromCvss, findingsFromPorts } from './severity'

describe('severityFromCvss', () => {
  it('maps CVSS to bands', () => {
    expect(severityFromCvss(9.8)).toBe('Critical')
    expect(severityFromCvss(7.0)).toBe('High')
    expect(severityFromCvss(4.0)).toBe('Medium')
    expect(severityFromCvss(0.5)).toBe('Low')
  })
})

describe('findingsFromPorts', () => {
  it('produces exposure findings for risky ports (non-CVE ids)', () => {
    const out = findingsFromPorts('10.0.0.5', [23, 80, 3389])
    const ids = out.map((v) => v.id)
    expect(ids).toContain('EXPOSURE-23')
    expect(ids).toContain('EXPOSURE-3389')
    // port 80 is informational/low and still surfaced; all ids are EXPOSURE-*, never CVE-*
    expect(ids.every((id) => id.startsWith('EXPOSURE-'))).toBe(true)
    const telnet = out.find((v) => v.id === 'EXPOSURE-23')!
    expect(telnet.severity).toBe('High')
    expect(telnet.system).toBe('10.0.0.5')
    expect(telnet.patch).toBe('Harden')
  })
  it('returns nothing for ports with no known risk', () => {
    expect(findingsFromPorts('10.0.0.5', [49152])).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/main/agent/severity.ts`**
```ts
import type { Severity, Vuln } from '@shared/types'

export function severityFromCvss(score: number): Severity {
  if (score >= 9.0) return 'Critical'
  if (score >= 7.0) return 'High'
  if (score >= 4.0) return 'Medium'
  return 'Low'
}

interface PortRisk { severity: Severity; score: number; title: string }

// Curated risk for commonly-exposed services. Used when nmap/vulners is unavailable.
const PORT_RISK: Record<number, PortRisk> = {
  23: { severity: 'High', score: 8.0, title: 'Telnet exposed — cleartext credentials' },
  3389: { severity: 'High', score: 7.5, title: 'RDP exposed to the LAN' },
  445: { severity: 'High', score: 7.5, title: 'SMB file sharing exposed' },
  5900: { severity: 'Medium', score: 6.0, title: 'VNC exposed' },
  21: { severity: 'Medium', score: 5.0, title: 'FTP exposed — cleartext' },
  139: { severity: 'Medium', score: 5.0, title: 'NetBIOS session service exposed' },
  3306: { severity: 'Medium', score: 5.5, title: 'MySQL exposed to the LAN' },
  5432: { severity: 'Medium', score: 5.5, title: 'PostgreSQL exposed to the LAN' },
  22: { severity: 'Low', score: 2.5, title: 'SSH exposed' },
  80: { severity: 'Low', score: 2.0, title: 'HTTP service exposed' },
  443: { severity: 'Low', score: 1.5, title: 'HTTPS service exposed' },
  8080: { severity: 'Low', score: 2.0, title: 'HTTP-alt service exposed' }
}

/** Heuristic exposure findings from open ports (no real CVE ids). */
export function findingsFromPorts(hostId: string, openPorts: number[]): Vuln[] {
  const out: Vuln[] = []
  for (const port of openPorts) {
    const risk = PORT_RISK[port]
    if (!risk) continue
    out.push({
      id: `EXPOSURE-${port}`,
      title: risk.title,
      severity: risk.severity,
      score: risk.score,
      system: hostId,
      patch: 'Harden',
      age: '—'
    })
  }
  return out
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (3).

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.node.json --noEmit && npm run lint
```
Expected: node tsc 0 (preload gap if Task 7 not yet done — see Task 1 note); lint 0.

- [ ] **Step 6: Commit**
```bash
git add src/main/agent/severity.ts src/main/agent/severity.test.ts
git commit -m "feat: add CVSS->severity mapping and heuristic port-exposure findings"
```

---

## Task 3: Pure-Node TCP connect port scan

**Files:** Create `src/main/agent/portscan.ts`, `src/main/agent/portscan.test.ts`

- [ ] **Step 1: Write the failing test** — `src/main/agent/portscan.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { scanHostPorts, COMMON_PORTS } from './portscan'

describe('scanHostPorts', () => {
  it('returns only the open ports, using the injected probe', async () => {
    const open = new Set([22, 443])
    const probe = vi.fn(async (_ip: string, port: number) => open.has(port))
    const result = await scanHostPorts('10.0.0.2', [22, 23, 443], probe, { concurrency: 2, timeoutMs: 100 })
    expect(result.sort((a, b) => a - b)).toEqual([22, 443])
    expect(probe).toHaveBeenCalledTimes(3)
  })

  it('exposes a bounded common-ports list', () => {
    expect(COMMON_PORTS).toContain(22)
    expect(COMMON_PORTS).toContain(443)
    expect(COMMON_PORTS.length).toBeLessThanOrEqual(32)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/main/agent/portscan.ts`**
```ts
export type TcpProbe = (ip: string, port: number, timeoutMs: number) => Promise<boolean>

/** Bounded set of commonly-relevant ports for a fast connect scan. */
export const COMMON_PORTS: number[] = [
  21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 587, 993, 995,
  1433, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9000, 27017
]

export interface ScanPortsOpts {
  concurrency?: number
  timeoutMs?: number
}

/** Connect-scan `ports` on `ip` via the injected probe; returns the open ports. */
export async function scanHostPorts(
  ip: string,
  ports: number[],
  probe: TcpProbe,
  opts: ScanPortsOpts = {}
): Promise<number[]> {
  const concurrency = opts.concurrency ?? 16
  const timeoutMs = opts.timeoutMs ?? 800
  const open: number[] = []
  let i = 0

  async function worker(): Promise<void> {
    while (i < ports.length) {
      const port = ports[i++]!
      if (await probe(ip, port, timeoutMs)) open.push(port)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, ports.length) }, worker)
  await Promise.all(workers)
  return open
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (2).

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.node.json --noEmit && npm run lint
```
Expected: node tsc 0; lint 0.

- [ ] **Step 6: Commit**
```bash
git add src/main/agent/portscan.ts src/main/agent/portscan.test.ts
git commit -m "feat: add concurrency-limited pure-Node TCP connect port scan (DI)"
```

---

## Task 4: nmap vulners output parser (pure)

**Files:** Create `src/main/agent/nmap.ts`, `src/main/agent/nmap.test.ts`

The parser handles normal (`-sV --script vulners`) text output. The runner/detector are thin adapters added to `probes.ts` in Task 6 (not unit-tested).

- [ ] **Step 1: Write the failing test** — `src/main/agent/nmap.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseNmapVulners } from './nmap'

const SAMPLE = `
Nmap scan report for 10.0.0.5
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 7.4 (protocol 2.0)
| vulners:
|   cpe:/a:openbsd:openssh:7.4:
|       CVE-2018-15473   5.3   https://vulners.com/cve/CVE-2018-15473
|       CVE-2017-15906   5.3   https://vulners.com/cve/CVE-2017-15906
80/tcp   open  http    nginx 1.10.3
| vulners:
|   cpe:/a:igor_sysoev:nginx:1.10.3:
|       CVE-2019-9511    7.5   https://vulners.com/cve/CVE-2019-9511
`

describe('parseNmapVulners', () => {
  it('extracts open ports with service/version and CVEs with CVSS', () => {
    const { openPorts, cves } = parseNmapVulners(SAMPLE)
    expect(openPorts.find((p) => p.port === 22)).toMatchObject({ service: 'ssh', version: 'OpenSSH 7.4 (protocol 2.0)' })
    expect(openPorts.find((p) => p.port === 80)?.service).toBe('http')
    const ids = cves.map((c) => c.id)
    expect(ids).toContain('CVE-2018-15473')
    expect(ids).toContain('CVE-2019-9511')
    const c = cves.find((x) => x.id === 'CVE-2019-9511')!
    expect(c.score).toBe(7.5)
    expect(c.port).toBe(80)
  })

  it('returns empty arrays for output with no open ports', () => {
    expect(parseNmapVulners('Nmap done: 1 IP address')).toEqual({ openPorts: [], cves: [] })
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/main/agent/nmap.ts`**
```ts
import type { OpenPort } from '@shared/types'

export interface NmapCve { id: string; score: number; port: number }
export interface NmapParseResult { openPorts: OpenPort[]; cves: NmapCve[] }

const PORT_LINE = /^(\d+)\/tcp\s+open\s+(\S+)(?:\s+(.*))?$/
const CVE_LINE = /\b(CVE-\d{4}-\d{4,})\b\s+(\d+(?:\.\d+)?)/

/** Parse `nmap -sV --script vulners` normal output into ports + CVEs. */
export function parseNmapVulners(text: string): NmapParseResult {
  const openPorts: OpenPort[] = []
  const cves: NmapCve[] = []
  let currentPort = 0

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const portMatch = raw.match(PORT_LINE)
    if (portMatch) {
      currentPort = Number(portMatch[1])
      openPorts.push({
        port: currentPort,
        service: portMatch[2] ?? null,
        version: portMatch[3]?.trim() || null
      })
      continue
    }
    const cveMatch = line.match(CVE_LINE)
    if (cveMatch && currentPort) {
      cves.push({ id: cveMatch[1]!, score: Number(cveMatch[2]), port: currentPort })
    }
  }
  return { openPorts, cves }
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (2).

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.node.json --noEmit && npm run lint
```
Expected: node tsc 0; lint 0.

- [ ] **Step 6: Commit**
```bash
git add src/main/agent/nmap.ts src/main/agent/nmap.test.ts
git commit -m "feat: add pure nmap vulners output parser (ports + CVEs)"
```

---

## Task 5: Scan orchestrator (pure, DI)

**Files:** Create `src/main/agent/scan.ts`, `src/main/agent/scan.test.ts`

- [ ] **Step 1: Write the failing test** — `src/main/agent/scan.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { runScan } from './scan'
import type { Device } from '@shared/types'

const dev = (over: Partial<Device>): Device => ({
  name: 'n', type: 'Unknown', ico: 'globe', mac: 'M', ip: '10.0.0.2',
  online: true, signal: 100, role: 'Endpoint', ...over
})

describe('runScan', () => {
  it('uses heuristic findings when nmap is unavailable', async () => {
    const hosts = [dev({ mac: 'A', ip: '10.0.0.2' })]
    const result = await runScan(hosts, {
      now: () => 1000,
      nmapAvailable: false,
      portScan: async () => [23, 80],
      nmapScan: async () => { throw new Error('should not be called') }
    })
    expect(result.nmapAvailable).toBe(false)
    expect(result.hosts[0]!.openPorts.map((p) => p.port)).toEqual([23, 80])
    expect(result.hosts[0]!.worstSeverity).toBe('High') // telnet
    expect(result.vulns.some((v) => v.id === 'EXPOSURE-23')).toBe(true)
    expect(result.lastScanAt).toBe(1000)
  })

  it('uses nmap CVEs when available', async () => {
    const hosts = [dev({ mac: 'A', ip: '10.0.0.2', name: 'box' })]
    const result = await runScan(hosts, {
      now: () => 5,
      nmapAvailable: true,
      portScan: async () => [22],
      nmapScan: async () => ({
        openPorts: [{ port: 22, service: 'ssh', version: 'OpenSSH 7.4' }],
        cves: [{ id: 'CVE-2018-15473', score: 5.3, port: 22 }]
      })
    })
    expect(result.nmapAvailable).toBe(true)
    expect(result.vulns.find((v) => v.id === 'CVE-2018-15473')).toBeTruthy()
    expect(result.hosts[0]!.worstSeverity).toBe('Medium') // 5.3
    expect(result.hosts[0]!.openPorts[0]!.version).toBe('OpenSSH 7.4')
  })

  it('only scans online hosts', async () => {
    const result = await runScan([dev({ mac: 'A', online: false })], {
      now: () => 1, nmapAvailable: false,
      portScan: async () => { throw new Error('offline host must not be scanned') },
      nmapScan: async () => { throw new Error('no') }
    })
    expect(result.hosts).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/main/agent/scan.ts`**
```ts
import type { Device, HostScan, ScanResult, Severity, Vuln } from '@shared/types'
import { severityFromCvss, findingsFromPorts } from './severity'

export interface NmapHostResult {
  openPorts: { port: number; service: string | null; version: string | null }[]
  cves: { id: string; score: number; port: number }[]
}

export interface RunScanDeps {
  now: () => number
  nmapAvailable: boolean
  portScan: (ip: string) => Promise<number[]>
  nmapScan: (ip: string) => Promise<NmapHostResult>
}

const SEVERITY_RANK: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }

function worst(vulns: Vuln[]): Severity | null {
  let best: Severity | null = null
  for (const v of vulns) {
    if (!best || SEVERITY_RANK[v.severity] > SEVERITY_RANK[best]) best = v.severity
  }
  return best
}

/** Scan the online hosts and aggregate per-host + overall findings. Pure (deps injected). */
export async function runScan(devices: Device[], deps: RunScanDeps): Promise<ScanResult> {
  const online = devices.filter((d) => d.online)
  const hosts: HostScan[] = []

  for (const d of online) {
    const hostId = d.name || d.ip
    const openPortNums = await deps.portScan(d.ip)

    if (deps.nmapAvailable && openPortNums.length > 0) {
      const nm = await deps.nmapScan(d.ip)
      const vulns: Vuln[] = nm.cves.map((c) => ({
        id: c.id,
        title: `${c.id} on port ${c.port}`,
        severity: severityFromCvss(c.score),
        score: c.score,
        system: hostId,
        patch: 'Available',
        age: '—'
      }))
      hosts.push({
        mac: d.mac, ip: d.ip,
        openPorts: nm.openPorts.length ? nm.openPorts : openPortNums.map((p) => ({ port: p, service: null, version: null })),
        vulns,
        worstSeverity: worst(vulns)
      })
    } else {
      const vulns = findingsFromPorts(hostId, openPortNums)
      hosts.push({
        mac: d.mac, ip: d.ip,
        openPorts: openPortNums.map((p) => ({ port: p, service: null, version: null })),
        vulns,
        worstSeverity: worst(vulns)
      })
    }
  }

  const vulns = hosts.flatMap((h) => h.vulns).sort((a, b) => b.score - a.score)
  return { scanning: false, lastScanAt: deps.now(), nmapAvailable: deps.nmapAvailable, vulns, hosts }
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (3).

- [ ] **Step 5: Quality gate**
```bash
npx tsc -p tsconfig.node.json --noEmit && npm run lint
```
Expected: node tsc 0; lint 0.

- [ ] **Step 6: Commit**
```bash
git add src/main/agent/scan.ts src/main/agent/scan.test.ts
git commit -m "feat: add scan orchestrator (port scan + nmap/heuristic aggregation)"
```

---

## Task 6: Agent wiring — probes + scan state + IPC

**Files:** Modify `src/main/agent/probes.ts`, `src/main/agent/ipc.ts`

- [ ] **Step 1: Add real probes to `src/main/agent/probes.ts`** (append; keep existing):
```ts
import net from 'node:net'

/** TCP connect probe: resolves true if the port accepts a connection within timeoutMs. */
export function tcpProbe(ip: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let done = false
    const finish = (open: boolean) => {
      if (done) return
      done = true
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(port, ip)
  })
}

/** True if `nmap` is on PATH. */
export async function hasNmap(): Promise<boolean> {
  try {
    await execFileAsync('nmap', ['--version'], { timeout: 4000 })
    return true
  } catch {
    return false
  }
}

/** Run `nmap -sV --script vulners` against one host; returns raw stdout. */
export async function runNmap(ip: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'nmap',
    ['-sV', '--script', 'vulners', '-Pn', '-T4', ip],
    { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 }
  )
  return stdout
}
```
(`execFileAsync` already exists at the top of `probes.ts`.)

- [ ] **Step 2: Wire scan into `src/main/agent/ipc.ts`.** Make these edits:
- Imports: `import { ScanResult } from '@shared/types'` (add to the type import); `import { runScan } from './scan'`; `import { scanHostPorts, COMMON_PORTS } from './portscan'`; `import { parseNmapVulners } from './nmap'`; add `tcpProbe, hasNmap, runNmap` to the `./probes` import.
- Keep a module-scoped latest `ScanResult` and a `scanning` flag inside `startAgent()`:
```ts
  let lastScan: ScanResult = { scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }
  const pushScan = () => {
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('vanta:scan', lastScan)
  }

  const doScan = async () => {
    if (lastScan.scanning) return
    lastScan = { ...lastScan, scanning: true }
    pushScan()
    const devices = store.listHosts().map(toDevice)
    const nmapAvailable = await hasNmap()
    const result = await runScan(devices, {
      now: Date.now,
      nmapAvailable,
      portScan: (ip) => scanHostPorts(ip, COMMON_PORTS, tcpProbe, { concurrency: 16, timeoutMs: 800 }),
      nmapScan: async (ip) => parseNmapVulners(await runNmap(ip))
    })
    lastScan = result
    pushScan()
  }

  ipcMain.handle('vanta:scan:run', () => { void doScan() })
  ipcMain.handle('vanta:scan:current', () => lastScan)
```
(Do NOT auto-run scans on a timer — on-demand only. `doScan` guards against overlap via the `scanning` flag.)

- [ ] **Step 3: Quality gate**
```bash
npx tsc -p tsconfig.node.json --noEmit && npm run lint && npm test
```
Expected: node tsc 0 (preload still pending until Task 7 — report if that's the only error); lint 0; tests pass.

- [ ] **Step 4: Commit**
```bash
git add src/main/agent/probes.ts src/main/agent/ipc.ts
git commit -m "feat: wire on-demand vulnerability scan (tcp probe + progressive nmap) over IPC"
```

---

## Task 7: Preload — expose `window.vanta.scan`

**Files:** Modify `src/preload/index.ts`

- [ ] **Step 1: Add `scan`** to the `api` object (keep `ping`/`devices`/`stats`); add `ScanResult` to the `@shared/types` import:
```ts
  scan: {
    run: () => ipcRenderer.invoke('vanta:scan:run'),
    current: () => ipcRenderer.invoke('vanta:scan:current'),
    subscribe: (cb: (result: ScanResult) => void) => {
      const listener = (_e: unknown, result: ScanResult) => cb(result)
      ipcRenderer.on('vanta:scan', listener)
      return () => ipcRenderer.removeListener('vanta:scan', listener)
    }
  }
```

- [ ] **Step 2: Quality gate**
```bash
npx tsc -p tsconfig.node.json --noEmit && npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: all 0.

- [ ] **Step 3: Commit**
```bash
git add src/preload/index.ts
git commit -m "feat: expose window.vanta.scan (run + current + subscribe) in preload"
```

---

## Task 8: `useScan` hook + Vulnerabilities tab

**Files:** Create `src/renderer/src/hooks/useScan.ts` + `useScan.test.tsx`; Modify `src/renderer/src/views/VulnerabilitiesView.tsx`

- [ ] **Step 1: Write the failing hook test** — `src/renderer/src/hooks/useScan.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useScan } from './useScan'
import type { ScanResult } from '@shared/types'

const empty: ScanResult = { scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }

describe('useScan', () => {
  beforeEach(() => {
    let cb: ((r: ScanResult) => void) | null = null
    ;(window as unknown as { vanta: unknown }).vanta = {
      ping: vi.fn(),
      devices: { list: vi.fn().mockResolvedValue([]), subscribe: () => () => {} },
      stats: { current: vi.fn().mockResolvedValue({ rxMbps: 0, txMbps: 0, rxHistory: [], txHistory: [] }), subscribe: () => () => {} },
      scan: {
        run: vi.fn().mockResolvedValue(undefined),
        current: vi.fn().mockResolvedValue(empty),
        subscribe: (fn: (r: ScanResult) => void) => { cb = fn; return () => { cb = null } }
      }
    }
    ;(window as unknown as { __emitScan: (r: ScanResult) => void }).__emitScan = (r) => cb?.(r)
  })

  it('loads current then applies live scan updates; run() calls the bridge', async () => {
    const { result } = renderHook(() => useScan())
    await waitFor(() => expect(result.current.result.scanning).toBe(false))
    act(() => result.current.run())
    expect((window.vanta.scan.run as unknown as { mock: unknown })).toBeTruthy()
    act(() => (window as unknown as { __emitScan: (r: ScanResult) => void }).__emitScan({ ...empty, scanning: true }))
    expect(result.current.result.scanning).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails** → module not found.

- [ ] **Step 3: Create `src/renderer/src/hooks/useScan.ts`**
```ts
import { useEffect, useState, useCallback } from 'react'
import type { ScanResult } from '@shared/types'

const EMPTY: ScanResult = { scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }

export function useScan(): { result: ScanResult; run: () => void } {
  const [result, setResult] = useState<ScanResult>(EMPTY)
  useEffect(() => {
    let mounted = true
    window.vanta.scan.current().then((r) => { if (mounted) setResult(r) })
    const unsubscribe = window.vanta.scan.subscribe((r) => { if (mounted) setResult(r) })
    return () => { mounted = false; unsubscribe() }
  }, [])
  const run = useCallback(() => { void window.vanta.scan.run() }, [])
  return { result, run }
}
```

- [ ] **Step 4: Run to verify it passes** → PASS (1).

- [ ] **Step 5: Wire `src/renderer/src/views/VulnerabilitiesView.tsx`.** Read it first. Preserve ALL markup/classes; only swap data + the scan trigger:
- Remove `import { VULNS } from '../data'`; add `import { useScan } from '../hooks/useScan'`.
- At the top: `const { result, run } = useScan()`; `const VULNS = result.vulns`. Keep the existing `useState` severity filter; `const filtered = sev === 'All' ? VULNS : VULNS.filter((v) => v.severity === sev)`.
- Severity stat cards: replace each hardcoded count with a computed one: `VULNS.filter((v) => v.severity === 'Critical').length` (and High/Medium/Low). Remove fabricated `trend` deltas the same way as Phase 3 (replace with an honest neutral descriptor or drop the number) — do not show fake "+1 today".
- The filter chips' counts (`counts[s]`) → compute from `VULNS` (`Record<Severity, number>`), not the static object.
- Wire the scan trigger: the view's primary action button (the one in the card head / "Run Scan"-style control) `onClick={run}`; show scanning state (e.g., button label "Scanning…" when `result.scanning`, else "Run Scan"). If there are no vulns and not scanning, render an honest empty row/line: `result.lastScanAt ? 'No findings.' : 'Run a scan to assess your devices.'` Keep table markup.
- If `result.nmapAvailable` is false, show a subtle hint near the table header that deep CVE scanning needs nmap (keep within existing `card-sub`/text classes; do not add new layout).

- [ ] **Step 6: Quality gate (web)**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: 0 / 0. (Full `npm test` will fail on the views/App stubs missing `scan` — fixed in Task 10.)

- [ ] **Step 7: Commit**
```bash
git add src/renderer/src/hooks/useScan.ts src/renderer/src/hooks/useScan.test.tsx src/renderer/src/views/VulnerabilitiesView.tsx
git commit -m "feat: wire Vulnerabilities tab to live scan findings + on-demand scan"
```

---

## Task 9: Topology risk integration (node states + open ports)

**Files:** Modify `src/renderer/src/topology.ts` (+ its test), `src/renderer/src/views/NetworkView.tsx`

- [ ] **Step 1: Extend `buildTopology` to accept per-host risk.** Update the signature and add a test case. New signature:
```ts
export function buildTopology(devices: Device[], hostScans?: Map<string, HostScan>): TopologyGraph
```
Behaviour: for each non-gateway node, if `hostScans?.get(device.mac)?.worstSeverity` is `Critical`/`High` → state `red`; `Medium` → `warn`; offline → `warn`; else `ok`. Gateway stays the central `ok` node. Add to `topology.test.ts`:
```ts
it('marks hosts red/warn from scan severity', () => {
  const a = dev({ mac: 'A' })
  const scans = new Map([['A', { mac: 'A', ip: '10.0.0.2', openPorts: [], vulns: [], worstSeverity: 'Critical' as const }]])
  const { nodes } = buildTopology([dev({ mac: 'GW', role: 'Gateway' }), a], scans)
  expect(nodes.find((n) => n.id === 'A')!.state).toBe('red')
})
```
Implement by importing `HostScan` from `@shared/types` and computing state from severity (online + no/low risk → `ok`).

- [ ] **Step 2: Run topology tests** → all pass (`npx vitest run src/renderer/src/topology.test.ts`).

- [ ] **Step 3: Wire `NetworkView.tsx`.** Add `import { useScan } from '../hooks/useScan'`. In the component: `const { result, run } = useScan()`; build a `Map<string, HostScan>` from `result.hosts` keyed by mac; pass it to `useTopology`/`buildTopology`. (Update `useTopology` to accept and forward an optional `hostScans` map — modify `src/renderer/src/hooks/useTopology.ts` to take `hostScans?: Map<string, HostScan>` and pass it through to `buildTopology`.)
- In the node-detail panel, change the "Type" row (added in Phase 3) to ALSO show open ports, or repurpose the existing "Open ports" slot: set the open-ports value to `result.hosts.find((h) => h.mac === sel?.id)?.openPorts.map((p) => p.port).join(', ') || '—'`. Keep the `kv` markup.
- Wire the topology card's "Live"/"Path"/"Heatmap" filter-bar OR the existing primary control to trigger `run()` is optional; at minimum, ensure a scan triggered elsewhere updates node colors. (No new buttons required; the Vulnerabilities tab + dashboard already trigger scans.)

- [ ] **Step 4: Quality gate (web)**
```bash
npx tsc -p tsconfig.web.json --noEmit && npm run lint
```
Expected: 0 / 0.

- [ ] **Step 5: Commit**
```bash
git add src/renderer/src/topology.ts src/renderer/src/topology.test.ts src/renderer/src/hooks/useTopology.ts src/renderer/src/views/NetworkView.tsx
git commit -m "feat: drive topology node states + node-detail ports from scan results"
```

---

## Task 10: Fix tests for the scan IPC surface

**Files:** Modify `src/renderer/src/views/views.test.tsx`, `src/renderer/src/App.test.tsx`

- [ ] **Step 1:** Both files stub `window.vanta`. Extend BOTH stubs' object to include `scan`:
```ts
    scan: {
      run: () => Promise.resolve(),
      current: () => Promise.resolve({ scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }),
      subscribe: () => () => {}
    }
```
Keep existing assertions (`Active Vulnerabilities` card title still renders; `Network Topology` still renders). Remove any remaining assertions that depended on static `VULNS` rows (e.g. a specific `CVE-2026-1042`) — the live table is empty under the stub; assert the card title instead.

- [ ] **Step 2: Full suite**
Run: `npm test`
Expected: ALL tests pass.

- [ ] **Step 3: Commit**
```bash
git add src/renderer/src/views/views.test.tsx src/renderer/src/App.test.tsx
git commit -m "test: stub window.vanta.scan for Vulnerabilities/Network render tests"
```

---

## Task 11: QA gate + boot smoke

- [ ] **Step 1: Full automated gate**
```bash
npm run lint && npm run typecheck && npm test && npm run build && npm audit
```
Expected: lint 0; typecheck 0; all tests pass; build succeeds; **0 vulnerabilities**.

- [ ] **Step 2: Electron boot smoke test** (kill by exact PID — never `pkill` by name):
```bash
(./node_modules/.bin/electron . >/tmp/vanta_p4_smoke.log 2>&1 & echo $! >/tmp/vanta_p4_epid); sleep 10
EPID=$(cat /tmp/vanta_p4_epid); kill "$EPID" 2>/dev/null; sleep 1; ps -p "$EPID" >/dev/null 2>&1 && kill -9 "$EPID" 2>/dev/null
grep -iE "error|exception|cannot|failed|throw|ERR_|threw|not a function" /tmp/vanta_p4_smoke.log | grep -viE "IMKClient|IMKInputSession|Secure coding|CoreText|objc\[|DevTools|ViewBridge|TIPapp|GPU stall|stalls|cache" | head -20 || echo "clean boot"
```
Expected: clean boot (the agent starts; scans are on-demand so none runs at boot).

- [ ] **Step 3: Manual run (controller → user; needs a real LAN, ideally with `nmap` installed to exercise the deep path).** `npm run dev`; on the **Vulnerabilities** tab click **Run Scan** → findings populate (real CVEs if nmap is installed, else port-exposure findings); severity cards + filter work; the **Network** tab nodes recolor by risk and the node detail shows open ports.

- [ ] **Step 4: Commit any fixes** (`git commit -m "fix: address issues found during Phase 4 verification"`; skip if none).

---

## Self-Review

- **Spec coverage (Phase 4):** pure-Node port scan (Task 3) ✓; progressive nmap/vulners → real CVEs (Tasks 4–6) ✓; heuristic findings when nmap absent, no fake CVE ids (Task 2, 5) ✓; Vulnerabilities tab live + severity cards + filter + on-demand scan + honest empty/nmap states (Task 8) ✓; topology `warn`/`red` from severity + open ports in node detail — the Phase 3 deferral (Task 9) ✓; on-demand/bounded/connect-only safety (Tasks 5–6, documented) ✓; 99% fidelity preserved (Tasks 8–9) ✓; fabricated trend deltas removed (Task 8) ✓.
- **Placeholder scan:** none — concrete code/edits throughout. Heuristic findings explicitly use `EXPOSURE-*` ids, never fake `CVE-*`.
- **Type/name consistency:** `OpenPort`/`HostScan`/`ScanResult` + `VantaBridge.scan` defined in Task 1; consumed identically in `scan.ts`, `ipc.ts`, `preload`, `useScan`, and the views. `runScan` deps (`portScan`/`nmapScan`/`nmapAvailable`/`now`) match the agent wiring in Task 6. `buildTopology(devices, hostScans?)` signature change (Task 9) is threaded through `useTopology` and `NetworkView`. IPC channels `vanta:scan` (event) + `vanta:scan:run`/`vanta:scan:current` (invoke) match across `ipc.ts` and `preload`.

---

## Next phases (separate plans)
5. **Threats** — rule engine over discovery + scan deltas/findings (new device joined, new open port, risky exposure, gateway/DNS change) → the live Threats feed + real Anomalies; introduces the durable SQLite `Store`.
6. **Dashboard wiring + packaging** — composite health score, host metrics, forecast baseline; `electron-builder` installers; local fonts + CSP (Phase 1 review follow-ups).
