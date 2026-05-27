import { describe, it, expect, vi } from 'vitest'
import { scanHostPorts, COMMON_PORTS } from './portscan'

describe('scanHostPorts', () => {
  it('returns only the open ports, using the injected probe', async () => {
    const open = new Set([22, 443])
    const probe = vi.fn(async (_ip: string, port: number) => open.has(port))
    const result = await scanHostPorts('10.0.0.2', [22, 23, 443], probe, { concurrency: 2, timeoutMs: 100 })
    expect(result.sort((a, b) => a - b)).toEqual([22, 443])
    expect(probe).toHaveBeenCalledTimes(3)
  })

  it('exposes a bounded common-ports list', () => {
    expect(COMMON_PORTS).toContain(22)
    expect(COMMON_PORTS).toContain(443)
    expect(COMMON_PORTS.length).toBeLessThanOrEqual(32)
  })
})
