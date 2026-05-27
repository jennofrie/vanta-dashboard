import { describe, it, expect } from 'vitest'
import { FORECAST, SYSTEMS, DEVICES, VULNS, THREATS_FEED, NETWORK_NODES, NETWORK_EDGES } from './data'

describe('static data', () => {
  it('has the expected row counts from the prototype', () => {
    expect(FORECAST).toHaveLength(15)
    expect(SYSTEMS).toHaveLength(5)
    expect(DEVICES).toHaveLength(6)
    expect(VULNS).toHaveLength(7)
    expect(THREATS_FEED).toHaveLength(6)
    expect(NETWORK_NODES).toHaveLength(8)
    expect(NETWORK_EDGES).toHaveLength(9)
  })

  it('every network edge references real nodes', () => {
    const ids = new Set(NETWORK_NODES.map((n) => n.id))
    for (const [a, b] of NETWORK_EDGES) {
      expect(ids.has(a)).toBe(true)
      expect(ids.has(b)).toBe(true)
    }
  })
})
