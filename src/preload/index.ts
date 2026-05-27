import { contextBridge, ipcRenderer } from 'electron'
import type { VantaBridge } from '@shared/types'

const api: VantaBridge = {
  ping: () => ipcRenderer.invoke('vanta:ping')
}

contextBridge.exposeInMainWorld('vanta', api)
