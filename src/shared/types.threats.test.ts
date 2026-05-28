import { describe, it, expect } from 'vitest'
import type { ThreatsState } from '@shared/types'
import { THREAT_RULES } from '@shared/types'

describe('threats types', () => {
  it('exposes the rule names', () => {
    expect(THREAT_RULES).toContain('NEW_DEVICE')
    expect(THREAT_RULES).toContain('DEVICE_OFFLINE')
    expect(THREAT_RULES).toContain('RISKY_EXPOSURE')
    expect(THREAT_RULES).toContain('NEW_OPEN_PORT')
    expect(THREAT_RULES).toContain('GATEWAY_CHANGE')
  })
  it('ThreatsState holds events and active count', () => {
    const s: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }
    expect(s.activeCount).toBe(0)
    expect(s.lastUpdated).toBeNull()
  })
})
