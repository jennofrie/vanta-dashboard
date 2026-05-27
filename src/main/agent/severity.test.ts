import { describe, it, expect } from 'vitest'
import { findingsFromPorts } from './severity'

describe('findingsFromPorts', () => {
  it('produces exposure findings for risky ports (non-CVE ids)', () => {
    const out = findingsFromPorts('10.0.0.5', [23, 80, 3389])
    const ids = out.map((v) => v.id)
    expect(ids).toContain('EXPOSURE-23')
    expect(ids).toContain('EXPOSURE-3389')
    expect(ids.every((id) => id.startsWith('EXPOSURE-'))).toBe(true)
    const telnet = out.find((v) => v.id === 'EXPOSURE-23')!
    expect(telnet.severity).toBe('High')
    expect(telnet.system).toBe('10.0.0.5')
    expect(telnet.patch).toBe('Harden')
  })
  it('returns nothing for ports with no known risk', () => {
    expect(findingsFromPorts('10.0.0.5', [49152])).toEqual([])
  })
})
