export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const
export type Severity = (typeof SEVERITIES)[number]

export type NodeState = 'ok' | 'warn' | 'red' | 'blue'

export interface ForecastPoint {
  d: string
  actual: number
  predicted: number
  conf: number
}

export interface SystemRow {
  connector: string
  ico: string
  workload: string
  score: number
  threats: 'Low' | 'Med' | 'High'
  patches: string
  state: 'low' | 'med' | 'high'
}

export interface Device {
  name: string
  type: string
  ico: string
  mac: string
  ip: string
  online: boolean
  signal: number
  role: string
  vendor?: string
}

export interface Vuln {
  id: string
  title: string
  severity: Severity
  score: number
  system: string
  patch: string
  age: string
}

export interface ThreatEvent {
  sev: Severity
  source: string
  title: string
  desc: string
  time: string
  region: string
}

export interface NetworkNode {
  id: string
  x: number
  y: number
  label: string
  ico: string
  state: NodeState
  meta: string
}

export type NetworkEdge = [string, string]

export interface TopologyGraph {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

export const DEVICE_CLASSES = [
  'router', 'server', 'phone', 'tv', 'camera', 'speaker', 'watch', 'laptop',
  'printer', 'iot', 'unknown'
] as const
export type DeviceClass = (typeof DEVICE_CLASSES)[number]

// Raw host as discovered/classified by the agent (superset of the UI Device).
export interface DiscoveredHost {
  ip: string
  mac: string
  hostname: string | null
  vendor: string | null
  online: boolean
  latencyMs: number | null
  deviceClass: DeviceClass
  services: string[]
  firstSeen: number
  lastSeen: number
}

export interface NetStats {
  rxMbps: number
  txMbps: number
  rxHistory: number[]
  txHistory: number[]
}

export interface OpenPort {
  port: number
  service: string | null
  version: string | null
}

export interface HostScan {
  mac: string
  ip: string
  openPorts: OpenPort[]
  vulns: Vuln[]
  worstSeverity: Severity | null
}

export interface ScanResult {
  scanning: boolean
  lastScanAt: number | null
  nmapAvailable: boolean
  vulns: Vuln[]
  hosts: HostScan[]
}

export interface VantaBridge {
  ping(): Promise<'pong'>
  devices: {
    list(): Promise<Device[]>
    /** Subscribe to live device updates. Returns an unsubscribe fn. */
    subscribe(cb: (devices: Device[]) => void): () => void
  }
  stats: {
    current(): Promise<NetStats>
    subscribe(cb: (stats: NetStats) => void): () => void
  }
  scan: {
    run(): Promise<void>
    current(): Promise<ScanResult>
    subscribe(cb: (result: ScanResult) => void): () => void
  }
}
