import type { OpenPort } from '@shared/types'

const PORT_LINE = /^(\d+)\/tcp\s+open\s+(\S+)(?:\s+(.*))?$/

/** Parse `nmap -sV` normal output into open ports with service + version. Pure. */
export function parseNmapServices(text: string): OpenPort[] {
  const openPorts: OpenPort[] = []
  for (const raw of text.split('\n')) {
    const m = raw.match(PORT_LINE)
    if (!m) continue
    openPorts.push({
      port: Number(m[1]),
      service: m[2] ?? null,
      version: m[3]?.trim() || null
    })
  }
  return openPorts
}
