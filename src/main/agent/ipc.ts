import { BrowserWindow, ipcMain } from 'electron'
import type { Device, DiscoveredHost } from '@shared/types'
import { InMemoryStore } from './store'
import { Scheduler } from './scheduler'
import { discover } from './discovery'
import { lookupVendor } from './vendor'
import { labelsFor } from './classify'
import { getGatewayIp, arpScan, mdnsScan } from './probes'

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
    role
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
  return { stop: () => scheduler.stop() }
}
