import { BrowserWindow, ipcMain } from 'electron'
import type { Device, DiscoveredHost, NetStats } from '@shared/types'
import { InMemoryStore } from './store'
import { Scheduler } from './scheduler'
import { discover } from './discovery'
import { lookupVendor } from './vendor'
import { labelsFor } from './classify'
import { getGatewayIp, arpScan, mdnsScan, netStats } from './probes'
import { NetStatsAccumulator } from './netstats'

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
  const store = new InMemoryStore()

  const sweep = async (): Promise<Device[]> => {
    const gatewayIp = await getGatewayIp()
    const hosts = await discover({ gatewayIp, now: Date.now, arpScan, mdnsScan, lookupVendor })
    store.upsertHosts(hosts)
    store.reconcileOnline(hosts.map((h) => h.mac))
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

  return { stop: () => { scheduler.stop(); statsScheduler.stop() } }
}
