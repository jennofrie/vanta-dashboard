import type { NetStats } from '@shared/types'

/** Keeps the latest RX/TX Mbps plus a bounded rolling history for sparklines. */
export class NetStatsAccumulator {
  private rx: number[] = []
  private tx: number[] = []
  constructor(private readonly max = 12) {}

  push(rxMbps: number, txMbps: number): void {
    this.rx.push(rxMbps)
    this.tx.push(txMbps)
    if (this.rx.length > this.max) this.rx.shift()
    if (this.tx.length > this.max) this.tx.shift()
  }

  snapshot(): NetStats {
    return {
      rxMbps: this.rx.at(-1) ?? 0,
      txMbps: this.tx.at(-1) ?? 0,
      rxHistory: [...this.rx],
      txHistory: [...this.tx]
    }
  }
}
