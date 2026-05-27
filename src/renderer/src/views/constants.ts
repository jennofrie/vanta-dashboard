import type { Severity } from '@shared/types'

export const SEV_DOT: Record<Severity, string> = {
  Critical: 'red',
  High: 'red',
  Medium: 'amber',
  Low: ''
}

export const SEV_CLASS: Record<string, string> = {
  Critical: 'crit',
  High: 'high',
  Medium: 'med',
  Low: 'low'
}
