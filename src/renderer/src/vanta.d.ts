import type { VantaBridge } from '@shared/types'

declare global {
  interface Window {
    vanta: VantaBridge
  }
}

export {}
