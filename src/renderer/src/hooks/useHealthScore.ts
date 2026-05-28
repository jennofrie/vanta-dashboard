import { useMemo } from 'react'
import { useScan } from './useScan'
import { useThreats } from './useThreats'
import { computeHealthScore } from '../health'

export function useHealthScore(): number {
  const { result: scan } = useScan()
  const threats = useThreats()
  return useMemo(() => computeHealthScore(scan, threats), [scan, threats])
}
