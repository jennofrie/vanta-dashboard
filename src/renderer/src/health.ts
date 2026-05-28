import type { ScanResult, ThreatsState } from '@shared/types'

const PENALTY: Record<string, number> = { Critical: 15, High: 8, Medium: 3 }
const CAP:     Record<string, number> = { Critical: 45, High: 24, Medium: 9 }

/** Composite security health score (0–100). Pure function. */
export function computeHealthScore(scan: ScanResult, threats: ThreatsState): number {
  let penalty = 0
  for (const band of ['Critical', 'High', 'Medium'] as const) {
    const count = scan.vulns.filter((v) => v.severity === band).length
    penalty += Math.min(count * PENALTY[band]!, CAP[band]!)
  }
  penalty += Math.min(threats.activeCount * 10, 20)
  return Math.max(0, Math.min(100, 100 - penalty))
}
