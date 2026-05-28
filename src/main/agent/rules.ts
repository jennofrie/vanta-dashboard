import type { DiscoveredHost, HostScan, ThreatEvent } from '@shared/types'

export interface RulesDeps {
  prevHosts: DiscoveredHost[]
  currHosts: DiscoveredHost[]
  prevScans: HostScan[]
  currScans: HostScan[]
  prevGatewayIp: string | null
  currGatewayIp: string | null
  now: () => number
}

/** Pure, DI-testable rule engine. Takes before/after host + scan snapshots → ThreatEvent[]. */
export function applyRules(deps: RulesDeps): ThreatEvent[] {
  const events: ThreatEvent[] = []
  const prevMacs = new Set(deps.prevHosts.map((h) => h.mac))
  const currByMac = new Map(deps.currHosts.map((h) => [h.mac, h]))

  // NEW_DEVICE — MAC present in curr but not seen before
  for (const h of deps.currHosts) {
    if (!prevMacs.has(h.mac) && h.online) {
      events.push({
        sev: 'Medium',
        source: h.ip,
        title: 'New device joined the network',
        desc: `MAC ${h.mac} · ${h.vendor ?? 'unknown vendor'} · ${h.deviceClass}`,
        time: 'just now',
        region: 'LAN'
      })
    }
  }

  // DEVICE_OFFLINE — was online in prev, now offline
  for (const prev of deps.prevHosts) {
    if (prev.online) {
      const curr = currByMac.get(prev.mac)
      if (curr && !curr.online) {
        events.push({
          sev: 'Low',
          source: prev.ip,
          title: 'Device went offline',
          desc: `${prev.hostname ?? prev.mac} · ${prev.vendor ?? 'unknown'}`,
          time: 'just now',
          region: 'LAN'
        })
      }
    }
  }

  // RISKY_EXPOSURE + NEW_OPEN_PORT — compare per-host scan results
  const prevScansByMac = new Map(deps.prevScans.map((s) => [s.mac, s]))
  for (const curr of deps.currScans) {
    const prev = prevScansByMac.get(curr.mac)
    const prevVulnIds = new Set(prev?.vulns.map((v) => v.id) ?? [])
    const prevPorts = new Set(prev?.openPorts.map((p) => p.port) ?? [])

    for (const vuln of curr.vulns) {
      if (!prevVulnIds.has(vuln.id)) {
        events.push({
          sev: vuln.severity,
          source: curr.ip,
          title: `New exposure: ${vuln.title}`,
          desc: `${vuln.id} · score ${vuln.score} · ${vuln.patch}`,
          time: 'just now',
          region: 'LAN'
        })
      }
    }

    for (const port of curr.openPorts) {
      if (!prevPorts.has(port.port)) {
        const svcDesc = port.service
          ? `${port.service}${port.version ? ' ' + port.version : ''}`
          : `unknown service`
        events.push({
          sev: 'Low',
          source: curr.ip,
          title: 'New open port detected',
          desc: `${svcDesc} on :${port.port}`,
          time: 'just now',
          region: 'LAN'
        })
      }
    }
  }

  // GATEWAY_CHANGE — gateway IP changed (possible MITM/reconfiguration)
  if (
    deps.prevGatewayIp !== null &&
    deps.currGatewayIp !== null &&
    deps.prevGatewayIp !== deps.currGatewayIp
  ) {
    events.push({
      sev: 'High',
      source: deps.currGatewayIp,
      title: 'Gateway IP changed',
      desc: `Was ${deps.prevGatewayIp} → now ${deps.currGatewayIp}`,
      time: 'just now',
      region: 'Gateway'
    })
  }

  return events
}
