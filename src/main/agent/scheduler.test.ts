import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Scheduler } from './scheduler'

describe('Scheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs immediately then on the interval, emitting each result', async () => {
    const results: number[][] = []
    let n = 0
    const sweep = vi.fn(async () => [++n])
    const s = new Scheduler({ intervalMs: 1000, sweep, onResult: (r: number[]) => results.push(r) })
    s.start()
    await vi.advanceTimersByTimeAsync(0)     // immediate run
    expect(results).toEqual([[1]])
    await vi.advanceTimersByTimeAsync(1000)  // next tick
    expect(results).toEqual([[1], [2]])
    s.stop()
    await vi.advanceTimersByTimeAsync(2000)  // no more after stop
    expect(results).toEqual([[1], [2]])
  })

  it('does not overlap runs if a sweep is slow', async () => {
    let active = 0
    let maxActive = 0
    const sweep = vi.fn(async () => {
      active++; maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 500)); active--
      return []
    })
    const s = new Scheduler({ intervalMs: 100, sweep, onResult: () => {} })
    s.start()
    await vi.advanceTimersByTimeAsync(2000)
    s.stop()
    expect(maxActive).toBe(1)
  })
})
