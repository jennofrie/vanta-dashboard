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

export interface VantaBridge {
  ping(): Promise<'pong'>
}
