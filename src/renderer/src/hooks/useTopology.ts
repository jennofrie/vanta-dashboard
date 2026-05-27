import { useMemo } from 'react'
import { useDevices } from './useDevices'
import { buildTopology } from '../topology'
import type { TopologyGraph, HostScan } from '@shared/types'

export function useTopology(hostScans?: Map<string, HostScan>): { graph: TopologyGraph; loading: boolean } {
  const { devices, loading } = useDevices()
  const graph = useMemo(() => buildTopology(devices, hostScans), [devices, hostScans])
  return { graph, loading }
}
