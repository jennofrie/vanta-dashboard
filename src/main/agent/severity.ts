import type { Severity, Vuln } from '@shared/types'

interface PortRisk { severity: Severity; score: number; title: string }

// Curated risk for commonly-exposed services (the findings source for local-only scans).
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

/** Honest exposure findings from open ports (no real CVE ids). */
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
