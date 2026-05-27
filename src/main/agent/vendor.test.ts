import { describe, it, expect, vi } from 'vitest'
import { makeVendorLookup } from './vendor'

describe('vendor lookup', () => {
  it('returns the org string for a known OUI', () => {
    const lookup = makeVendorLookup((mac) => (mac.startsWith('FC:FB:FB') ? 'Acme Corp' : null))
    expect(lookup('FC:FB:FB:01:02:03')).toBe('Acme Corp')
  })
  it('returns null for unknown and normalizes separators', () => {
    const raw = vi.fn().mockReturnValue(null)
    const lookup = makeVendorLookup(raw)
    expect(lookup('aa-bb-cc-dd-ee-ff')).toBeNull()
    expect(raw).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF')
  })
})
