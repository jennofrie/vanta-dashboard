import type { Device, HostScan, NetworkNode, NetworkEdge, TopologyGraph, NodeState } from '@shared/types'

const round = (n: number): number => Math.round(n * 10) / 10

/** Build a gateway-rooted radial topology from the live device list. Pure. */
export function buildTopology(devices: Device[], hostScans?: Map<string, HostScan>): TopologyGraph {
  if (devices.length === 0) return { nodes: [], edges: [] }

  const gateway = devices.find((d) => d.role === 'Gateway') ?? null
  const others = devices.filter((d) => d !== gateway)

  const nodes: NetworkNode[] = []
  const edges: NetworkEdge[] = []

  if (gateway) {
    nodes.push({ id: gateway.mac, x: 50, y: 50, label: gateway.name, ico: gateway.ico, state: 'ok', meta: gateway.ip })
  }

  const radius = 34
  const count = others.length
  others.forEach((d, i) => {
    const angle = (i / Math.max(1, count)) * 2 * Math.PI - Math.PI / 2
    const x = 50 + Math.cos(angle) * radius
    const y = 50 + Math.sin(angle) * radius
    const worstSeverity = hostScans?.get(d.mac)?.worstSeverity ?? null
    let state: NodeState
    if (worstSeverity === 'Critical' || worstSeverity === 'High') {
      state = 'red'
    } else if (worstSeverity === 'Medium') {
      state = 'warn'
    } else {
      state = d.online ? 'ok' : 'warn'
    }
    nodes.push({ id: d.mac, x: round(x), y: round(y), label: d.name, ico: d.ico, state, meta: d.ip })
    if (gateway) edges.push([d.mac, gateway.mac])
  })

  return { nodes, edges }
}
