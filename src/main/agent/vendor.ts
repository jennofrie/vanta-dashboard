import { createRequire } from 'node:module'

// oui-data's entry is index.json; load it via CJS require so the ESM main process
// doesn't need an `import ... with { type: 'json' }` attribute at runtime.
const requireCjs = createRequire(import.meta.url)
const ouiData = requireCjs('oui-data') as Record<string, string>

export type RawOuiLookup = (mac: string) => string | null

/** Normalize a MAC address to uppercase, colon-separated form. */
function normalizeMac(mac: string): string {
  return mac.trim().toUpperCase().replace(/-/g, ':')
}

/**
 * Wrap a raw OUI lookup with MAC normalization.
 * The raw function receives the normalized MAC and should return a string or null.
 */
export function makeVendorLookup(raw: RawOuiLookup) {
  return (mac: string): string | null => {
    const org = raw(normalizeMac(mac))
    return org && org.length > 0 ? org : null
  }
}

/**
 * Production lookup backed by the bundled offline oui-data JSON database.
 * oui-data is keyed by the first 6 hex chars (OUI) of the MAC in uppercase
 * with no separators. Returns the first line of the multi-line record (org name),
 * trimmed, or null if not found.
 */
export const lookupVendor = makeVendorLookup((mac: string): string | null => {
  // Extract OUI: first 6 hex chars from the normalized colon-separated MAC
  const oui = mac.replace(/:/g, '').substring(0, 6)
  const record = ouiData[oui]
  if (!record) return null
  return record.split('\n')[0]!.trim()
})
