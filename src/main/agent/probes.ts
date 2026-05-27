import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import si from 'systeminformation'
import type { ArpEntry, MdnsEntry } from './discovery'

const execFileAsync = promisify(execFile)

// bonjour-service is CJS; a named ESM import fails at runtime in the externalized
// main process, so load it via CJS require (types preserved via the cast).
const requireCjs = createRequire(import.meta.url)
const { Bonjour } = requireCjs('bonjour-service') as typeof import('bonjour-service')

export async function getGatewayIp(): Promise<string | null> {
  try {
    return (await si.networkGatewayDefault()) || null
  } catch {
    return null
  }
}

/** Normalize a MAC to uppercase, colon-separated, zero-padded octets. */
function normalizeMac(mac: string): string {
  return mac.split(':').map((o) => o.padStart(2, '0')).join(':').toUpperCase()
}

/**
 * Read the OS ARP table (`arp -a`). Parses macOS/Linux lines such as:
 *   host (10.0.0.1) at 9c:4f:2:ee:11:1 on en0 ifscope [ethernet]
 *   ? (10.0.0.5) at a4:b1:c2:d3:e4:f5 [ether] on eth0
 * Lines without a complete IP+MAC (e.g. "(incomplete)") are skipped.
 */
export async function arpScan(): Promise<ArpEntry[]> {
  const { stdout } = await execFileAsync('arp', ['-a'], { timeout: 5000 })
  const out: ArpEntry[] = []
  for (const line of stdout.split('\n')) {
    const ipM = line.match(/\(([0-9]{1,3}(?:\.[0-9]{1,3}){3})\)/)
    const macM = line.match(/\b([0-9a-fA-F]{1,2}(?::[0-9a-fA-F]{1,2}){5})\b/)
    if (!ipM || !macM) continue
    const nameM = line.match(/^(\S+)\s+\(/)
    const name = nameM && nameM[1] !== '?' ? nameM[1]! : null
    out.push({ ip: ipM[1]!, mac: normalizeMac(macM[1]!), name })
  }
  return out
}

/** Browse common mDNS service types for a short window; collect per-IP info. */
export async function mdnsScan(windowMs = 2500): Promise<MdnsEntry[]> {
  const bonjour = new Bonjour()
  const byIp = new Map<string, MdnsEntry>()
  const types = ['http', 'airplay', 'googlecast', 'ipp', 'printer', 'spotify-connect', 'raop', 'ssh', 'homekit', 'sonos']
  const browsers = types.map((type) =>
    bonjour.find({ type }, (svc) => {
      for (const ip of svc.addresses ?? []) {
        if (ip.includes(':')) continue // skip IPv6
        const cur = byIp.get(ip) ?? { ip, hostname: svc.host ?? '', services: [] }
        const svcType = `_${type}._tcp`
        if (!cur.services.includes(svcType)) cur.services.push(svcType)
        if (!cur.hostname && svc.host) cur.hostname = svc.host
        byIp.set(ip, cur)
      }
    })
  )
  await new Promise((r) => setTimeout(r, windowMs))
  browsers.forEach((b) => b.stop())
  bonjour.destroy()
  return [...byIp.values()].map((m) => ({ ...m, hostname: m.hostname.replace(/\.$/, '') }))
}

/** Current RX/TX throughput (Mbps) for the default interface, via systeminformation. */
export async function netStats(): Promise<{ rxMbps: number; txMbps: number }> {
  try {
    const stats = await si.networkStats()
    const s = stats[0]
    if (!s) return { rxMbps: 0, txMbps: 0 }
    const toMbps = (bytesPerSec: number) => Math.max(0, Math.round((bytesPerSec * 8) / 1e6 * 10) / 10)
    return { rxMbps: toMbps(s.rx_sec ?? 0), txMbps: toMbps(s.tx_sec ?? 0) }
  } catch {
    return { rxMbps: 0, txMbps: 0 }
  }
}
