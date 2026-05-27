export interface SchedulerOptions<T> {
  intervalMs: number
  sweep: () => Promise<T>
  onResult: (result: T) => void
}

/** Runs `sweep` immediately, then every intervalMs. Never overlaps runs. */
export class Scheduler<T> {
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private stopped = true

  constructor(private opts: SchedulerOptions<T>) {}

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    void this.tick()
  }

  stop(): void {
    this.stopped = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private async tick(): Promise<void> {
    if (this.stopped || this.running) return
    this.running = true
    try {
      const result = await this.opts.sweep()
      if (!this.stopped) this.opts.onResult(result)
    } catch {
      // a failed sweep must not kill the loop; next tick retries
    } finally {
      this.running = false
      if (!this.stopped) {
        this.timer = setTimeout(() => void this.tick(), this.opts.intervalMs)
      }
    }
  }
}
