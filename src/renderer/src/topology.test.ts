import { describe, it, expect } from 'vitest'
import { buildTopology } from './topology'
import type { Device } from '@shared/types'

const dev = (over: Partial<Device>): Device => ({
  name: 'n', type: 'Unknown', ico: 'globe', mac: 'M', ip: '10.0.0.9',
  online: true, signal: 100, role: 'Endpoint', ...over
})

describe('buildTopology', () => {
  it('puts the gateway at the centre and others on a ring, with star edges', () => {
    const gw = dev({ mac: 'GW', role: 'Gateway', ip: '10.0.0.1', name: 'Router' })
    const a = dev({ mac: 'A', ip: '10.0.0.2' })
    const b = dev({ mac: 'B', ip: '10.0.0.3', online: false })
    const { nodes, edges } = buildTopology([gw, a, b])

    const center = nodes.find((n) => n.id === 'GW')!
    expect(center.x).toBe(50)
    expect(center.y).toBe(50)
    expect(edges).toEqual(expect.arrayContaining([['A', 'GW'], ['B', 'GW']]))
    expect(edges).toHaveLength(2)
    expect(nodes.find((n) => n.id === 'A')!.state).toBe('ok')
    expect(nodes.find((n) => n.id === 'B')!.state).toBe('warn')
    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.x).toBeLessThanOrEqual(100)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeLessThanOrEqual(100)
    }
  })

  it('handles no gateway: all hosts on the ring, no edges', () => {
    const { nodes, edges } = buildTopology([dev({ mac: 'A' }), dev({ mac: 'B' })])
    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(0)
  })

  it('returns empty graph for no devices', () => {
    expect(buildTopology([])).toEqual({ nodes: [], edges: [] })
  })
})
