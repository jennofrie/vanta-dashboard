import { describe, it, expect } from 'vitest'
import { buildForecast } from './forecast'
import type { ThreatEvent } from '@shared/types'

const ev = (): ThreatEvent => ({ sev: 'Medium', source: '10.0.0.1', title: 'test', desc: '', time: 'now', region: 'LAN' })

describe('buildForecast', () => {
  it('returns exactly 15 points with valid shapes', () => {
    const now = new Date('2026-05-28').getTime()
    const points = buildForecast(Array.from({ length: 5 }, ev), now)
    expect(points).toHaveLength(15)
    expect(points.every((p) => typeof p.actual === 'number')).toBe(true)
    expect(points.every((p) => p.conf >= 0 && p.conf <= 1)).toBe(true)
    expect(points.every((p) => typeof p.d === 'string' && p.d.length > 0)).toBe(true)
  })

  it('returns 15 zero-padded points when no events', () => {
    const points = buildForecast([], Date.now())
    expect(points).toHaveLength(15)
    expect(points.every((p) => p.actual === 0 && p.predicted === 0)).toBe(true)
  })
})
