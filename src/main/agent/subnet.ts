/** Compute the network CIDR (e.g. "10.0.0.0/24") from an IPv4 + dotted netmask. */
export function deriveSubnet(ip: string, netmask: string): string {
  const ipParts = ip.split('.').map(Number)
  const maskParts = netmask.split('.').map(Number)
  if (ipParts.length !== 4 || maskParts.length !== 4) {
    throw new Error(`invalid ipv4/netmask: ${ip} / ${netmask}`)
  }
  const net = ipParts.map((o, i) => o & maskParts[i]!).join('.')
  const prefix = maskParts
    .map((o) => o.toString(2).padStart(8, '0'))
    .join('')
    .split('')
    .filter((b) => b === '1').length
  return `${net}/${prefix}`
}

/** Enumerate usable host IPs for a /24. Bounded by design: only /24 is supported. */
export function enumerateHosts(cidr: string): string[] {
  const [base, prefixStr] = cidr.split('/')
  if (prefixStr !== '24') {
    throw new Error(`only /24 subnets are supported for scanning, got /${prefixStr}`)
  }
  const octets = base!.split('.').map(Number)
  const out: string[] = []
  for (let i = 1; i <= 254; i++) {
    out.push(`${octets[0]}.${octets[1]}.${octets[2]}.${i}`)
  }
  return out
}
