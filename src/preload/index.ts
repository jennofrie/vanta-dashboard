import { contextBridge, ipcRenderer } from 'electron'
import type { VantaBridge, Device, NetStats } from '@shared/types'

const api: VantaBridge = {
  ping: () => ipcRenderer.invoke('vanta:ping'),
  devices: {
    list: () => ipcRenderer.invoke('vanta:devices:list'),
    subscribe: (cb: (devices: Device[]) => void) => {
      const listener = (_e: unknown, devices: Device[]) => cb(devices)
      ipcRenderer.on('vanta:devices', listener)
      return () => ipcRenderer.removeListener('vanta:devices', listener)
    }
  },
  stats: {
    current: () => ipcRenderer.invoke('vanta:stats:current'),
    subscribe: (cb: (stats: NetStats) => void) => {
      const listener = (_e: unknown, stats: NetStats) => cb(stats)
      ipcRenderer.on('vanta:stats', listener)
      return () => ipcRenderer.removeListener('vanta:stats', listener)
    }
  }
}

contextBridge.exposeInMainWorld('vanta', api)
