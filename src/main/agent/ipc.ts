import { BrowserWindow, ipcMain, app } from 'electron'
import { join } from 'node:path'
import type { Device, DiscoveredHost, NetStats, OpenPort, ScanResult, ThreatsState } from '@shared/types'
import { JsonFileStore } from './jsonFileStore'
import { applyRules } from './rules'
import { Scheduler } from './scheduler'
import { discover } from './discovery'
import { lookupVendor } from './vendor'
import { labelsFor } from './classify'
import { getGatewayIp, arpScan, mdnsScan, netStats, tcpProbe, hasNmap, runNmap } from './probes'
import { NetStatsAccumulator } from './netstats'
import { runScan } from './scan'
import { scanHostPorts, COMMON_PORTS } from './portscan'
import { parseNmapServices } from './nmap'

function toDevice(h: DiscoveredHost): Device {
  const lastOctet = h.ip.split('.').pop() ?? '0'
  const { ico, type, role } = labelsFor(h.deviceClass)
  return {
    name: h.hostname || (h.vendor ? `${h.vendor} ·${lastOctet}` : `Host ·${lastOctet}`),
    type,
    ico,
    mac: h.mac,
    ip: h.ip,
    online: h.online,
    signal: h.online ? 100 : 0, // reachability score (per spec substitution)
    role,
    vendor: h.vendor ?? undefined
  }
}

export function startAgent(): { stop: () => void } {
  const store = new JsonFileStore(join(app.getPath('userData'), 'vanta-state.json'))

  let threatsState: ThreatsState = { events: [], activeCount: 0, lastUpdated: null }
  const pushThreats = () => {
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('vanta:threats', threatsState)
  }
  const emitEvents = (newEvents: import('@shared/types').ThreatEvent[]) => {
    if (newEvents.length === 0) return
    store.appendEvents(newEvents)
    const all = store.listRecentEvents(100)
    threatsState = { events: all, activeCount: all.filter((e) => e.sev === 'Critical' || e.sev === 'High').length, lastUpdated: Date.now() }
    pushThreats()
  }

  const sweep = async (): Promise<Device[]> => {
    const gatewayIp = await getGatewayIp()
    const hosts = await discover({ gatewayIp, now: Date.now, arpScan, mdnsScan, lookupVendor })
    store.upsertHosts(hosts)
    store.reconcileOnline(hosts.map((h) => h.mac))
    // compute discovery deltas BEFORE snapshot (prev = last sweep, curr = this sweep)
    const discoveryEvents = applyRules({
      prevHosts: store.getPreviousHosts(),
      currHosts: store.listHosts(),
      prevScans: [],
      currScans: [],
      prevGatewayIp: store.getLastGatewayIp(),
      currGatewayIp: gatewayIp,
      now: Date.now
    })
    if (gatewayIp) store.setLastGatewayIp(gatewayIp)
    store.snapshotHosts()  // snapshot AFTER rules so next sweep diffs correctly
    emitEvents(discoveryEvents)
    return store.listHosts().map(toDevice)
  }

  const scheduler = new Scheduler<Device[]>({
    intervalMs: 45_000,
    sweep,
    onResult: (devices) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('vanta:devices', devices)
      }
    }
  })

  ipcMain.handle('vanta:devices:list', () => store.listHosts().map(toDevice))
  scheduler.start()

  const acc = new NetStatsAccumulator(12)
  const statsScheduler = new Scheduler<NetStats>({
    intervalMs: 3_000,
    sweep: async () => {
      const { rxMbps, txMbps } = await netStats()
      acc.push(rxMbps, txMbps)
      return acc.snapshot()
    },
    onResult: (stats) => {
      for (const win of BrowserWindow.getAllWindows()) win.webContents.send('vanta:stats', stats)
    }
  })
  ipcMain.handle('vanta:stats:current', () => acc.snapshot())
  statsScheduler.start()

  let lastScan: ScanResult = { scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }
  const pushScan = () => {
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('vanta:scan', lastScan)
  }
  let prevScanHosts: import('@shared/types').HostScan[] = []
  const doScan = async () => {
    if (lastScan.scanning) return
    lastScan = { ...lastScan, scanning: true }
    pushScan()
    const devices = store.listHosts().map(toDevice)
    const nmapAvailable = await hasNmap()
    lastScan = await runScan(devices, {
      now: Date.now,
      nmapAvailable,
      portScan: (ip) => scanHostPorts(ip, COMMON_PORTS, tcpProbe, { concurrency: 16, timeoutMs: 800 }),
      nmapScan: async (ip): Promise<OpenPort[]> => parseNmapServices(await runNmap(ip))
    })
    pushScan()
    const scanEvents = applyRules({
      prevHosts: store.listHosts(),
      currHosts: store.listHosts(),
      prevScans: prevScanHosts,
      currScans: lastScan.hosts,
      prevGatewayIp: null,
      currGatewayIp: null,
      now: Date.now
    })
    prevScanHosts = lastScan.hosts
    emitEvents(scanEvents)
  }
  ipcMain.handle('vanta:scan:run', () => { void doScan() })
  ipcMain.handle('vanta:scan:current', () => lastScan)

  ipcMain.handle('vanta:threats:current', () => threatsState)

  return { stop: () => { scheduler.stop(); statsScheduler.stop() } }
}
