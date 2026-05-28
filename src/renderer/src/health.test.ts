import { describe, it, expect } from 'vitest'
import { computeHealthScore } from './health'
import type { ScanResult, ThreatsState } from '@shared/types'

const emptyScan: ScanResult = { scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }
const emptyThreats: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }

describe('computeHealthScore', () => {
  it('returns 100 when no issues', () => {
    expect(computeHealthScore(emptyScan, emptyThreats)).toBe(100)
  })

  it('deducts for Critical vulns', () => {
    const scan: ScanResult = { ...emptyScan, vulns: [{ id: 'X', title: 'crit', severity: 'Critical', score: 9.5, system: 'h', patch: 'Harden', age: '—' }] }
    const score = computeHealthScore(scan, emptyThreats)
    expect(score).toBeLessThan(100)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('deducts for active High/Critical threats', () => {
    const threats: ThreatsState = { events: [], activeCount: 2, lastUpdated: 1 }
    expect(computeHealthScore(emptyScan, threats)).toBeLessThan(100)
  })

  it('score is never below 0 or above 100', () => {
    const scan: ScanResult = { ...emptyScan, vulns: Array.from({ length: 10 }, (_, i) => ({ id: `V${i}`, title: 'vuln', severity: 'Critical' as const, score: 9.5, system: 'h', patch: 'Harden', age: '—' }))}
    const threats: ThreatsState = { events: [], activeCount: 10, lastUpdated: 1 }
    const score = computeHealthScore(scan, threats)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
