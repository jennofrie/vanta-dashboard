import { contextBridge, ipcRenderer } from 'electron'
import type { VantaBridge, Device, NetStats, ScanResult, ThreatsState } from '@shared/types'

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
  },
  scan: {
    run: () => ipcRenderer.invoke('vanta:scan:run'),
    current: () => ipcRenderer.invoke('vanta:scan:current'),
    subscribe: (cb: (result: ScanResult) => void) => {
      const listener = (_e: unknown, result: ScanResult) => cb(result)
      ipcRenderer.on('vanta:scan', listener)
      return () => ipcRenderer.removeListener('vanta:scan', listener)
    }
  },
  threats: {
    current: () => ipcRenderer.invoke('vanta:threats:current'),
    subscribe: (cb: (state: ThreatsState) => void) => {
      const listener = (_e: unknown, state: ThreatsState) => cb(state)
      ipcRenderer.on('vanta:threats', listener)
      return () => ipcRenderer.removeListener('vanta:threats', listener)
    }
  }
}

contextBridge.exposeInMainWorld('vanta', api)
