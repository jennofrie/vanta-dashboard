import { describe, it, expect } from 'vitest'
import { NetStatsAccumulator } from './netstats'

describe('NetStatsAccumulator', () => {
  it('tracks current rates and a bounded rolling history', () => {
    const acc = new NetStatsAccumulator(3)
    acc.push(10, 2)
    acc.push(20, 4)
    let s = acc.snapshot()
    expect(s.rxMbps).toBe(20)
    expect(s.txMbps).toBe(4)
    expect(s.rxHistory).toEqual([10, 20])
    acc.push(30, 6)
    acc.push(40, 8)
    s = acc.snapshot()
    expect(s.rxHistory).toEqual([20, 30, 40])
    expect(s.txHistory).toEqual([4, 6, 8])
  })
})
