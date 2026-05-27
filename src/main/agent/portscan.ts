export type TcpProbe = (ip: string, port: number, timeoutMs: number) => Promise<boolean>

/** Bounded set of commonly-relevant ports for a fast connect scan. */
export const COMMON_PORTS: number[] = [
  21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 587, 993, 995,
  1433, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9000, 27017
]

export interface ScanPortsOpts {
  concurrency?: number
  timeoutMs?: number
}

/** Connect-scan `ports` on `ip` via the injected probe; returns the open ports. */
export async function scanHostPorts(
  ip: string,
  ports: number[],
  probe: TcpProbe,
  opts: ScanPortsOpts = {}
): Promise<number[]> {
  const concurrency = opts.concurrency ?? 16
  const timeoutMs = opts.timeoutMs ?? 800
  const open: number[] = []
  let i = 0

  async function worker(): Promise<void> {
    while (i < ports.length) {
      const port = ports[i++]!
      if (await probe(ip, port, timeoutMs)) open.push(port)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, ports.length) }, worker)
  await Promise.all(workers)
  return open
}
