import { contextBridge, ipcRenderer } from 'electron'
import type { VantaBridge, Device } from '@shared/types'

const api: VantaBridge = {
  ping: () => ipcRenderer.invoke('vanta:ping'),
  devices: {
    list: () => ipcRenderer.invoke('vanta:devices:list'),
    subscribe: (cb: (devices: Device[]) => void) => {
      const listener = (_e: unknown, devices: Device[]) => cb(devices)
      ipcRenderer.on('vanta:devices', listener)
      return () => ipcRenderer.removeListener('vanta:devices', listener)
    }
  }
}

contextBridge.exposeInMainWorld('vanta', api)
