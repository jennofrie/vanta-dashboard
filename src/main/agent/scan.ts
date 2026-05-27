import type { Device, HostScan, OpenPort, ScanResult, Severity, Vuln } from '@shared/types'
import { findingsFromPorts } from './severity'

export interface RunScanDeps {
  now: () => number
  nmapAvailable: boolean
  portScan: (ip: string) => Promise<number[]>
  nmapScan: (ip: string) => Promise<OpenPort[]>
}

const SEVERITY_RANK: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }

function worst(vulns: Vuln[]): Severity | null {
  let best: Severity | null = null
  for (const v of vulns) {
    if (!best || SEVERITY_RANK[v.severity] > SEVERITY_RANK[best]) best = v.severity
  }
  return best
}

/** Scan online hosts: open ports (+ optional nmap version enrichment) and heuristic findings. Pure. */
export async function runScan(devices: Device[], deps: RunScanDeps): Promise<ScanResult> {
  const online = devices.filter((d) => d.online)
  const hosts: HostScan[] = []

  for (const d of online) {
    const hostId = d.name || d.ip
    const openPortNums = await deps.portScan(d.ip)

    let openPorts: OpenPort[] = openPortNums.map((p) => ({ port: p, service: null, version: null }))
    if (deps.nmapAvailable && openPortNums.length > 0) {
      const enriched = await deps.nmapScan(d.ip)
      const byPort = new Map(enriched.map((e) => [e.port, e]))
      openPorts = openPortNums.map((p) => byPort.get(p) ?? { port: p, service: null, version: null })
    }

    const vulns = findingsFromPorts(hostId, openPortNums)
    hosts.push({ mac: d.mac, ip: d.ip, openPorts, vulns, worstSeverity: worst(vulns) })
  }

  const vulns = hosts.flatMap((h) => h.vulns).sort((a, b) => b.score - a.score)
  return { scanning: false, lastScanAt: deps.now(), nmapAvailable: deps.nmapAvailable, vulns, hosts }
}
