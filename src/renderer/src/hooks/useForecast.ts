import { useMemo, useState } from 'react'
import { useThreats } from './useThreats'
import { buildForecast } from '../forecast'
import type { ForecastPoint } from '@shared/types'

export function useForecast(): ForecastPoint[] {
  const { events } = useThreats()
  const [mountMs] = useState<number>(() => Date.now())
  return useMemo(() => buildForecast(events, mountMs), [events, mountMs])
}
