import { useMemo } from 'react'
import { useDevices } from './useDevices'
import { buildTopology } from '../topology'
import type { TopologyGraph } from '@shared/types'

export function useTopology(): { graph: TopologyGraph; loading: boolean } {
  const { devices, loading } = useDevices()
  const graph = useMemo(() => buildTopology(devices), [devices])
  return { graph, loading }
}
