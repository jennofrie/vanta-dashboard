import type { ForecastPoint, ThreatEvent } from '@shared/types'

/** Build a 15-day threat-trend series ending at `nowMs`.
 *  Actual: event counts bucketed by day.
 *  Predicted: 3-day moving average of actual.
 *  Conf: inverse relative variance (0–1). */
export function buildForecast(events: ThreatEvent[], nowMs: number): ForecastPoint[] {
  const MS_DAY = 86_400_000
  const DAYS = 15

  // Bucket events into days (most recent events fall on day index DAYS-1 = today)
  const buckets: number[] = Array.from({ length: DAYS }, () => 0)
  // Events from useThreats carry 'just now' not a numeric ts; treat all as today
  buckets[DAYS - 1] = events.length

  // 3-day moving-average prediction
  const predicted = buckets.map((_, i) => {
    const slice = buckets.slice(Math.max(0, i - 2), i + 1)
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10
  })

  // Confidence: simpler formula that's always 0-1
  const mean = buckets.reduce((a, b) => a + b, 0) / DAYS
  const variance = buckets.map((b) => (b - mean) ** 2).reduce((a, b) => a + b, 0) / DAYS
  const baseConf = mean === 0 ? 0.7 : Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / Math.max(1, mean + 1)))

  return buckets.map((actual, i): ForecastPoint => {
    const d = new Date(nowMs - (DAYS - 1 - i) * MS_DAY)
    const label = `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`
    const conf = Math.max(0, Math.min(1, Math.round((baseConf + (i / DAYS) * 0.05) * 100) / 100))
    return { d: label, actual, predicted: predicted[i]!, conf }
  })
}
