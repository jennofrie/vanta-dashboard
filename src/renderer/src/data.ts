import type { ForecastPoint, SystemRow, Device, Vuln, ThreatEvent, NetworkNode, NetworkEdge } from '@shared/types'

export const FORECAST: ForecastPoint[] = [
  { d: "8 Sep", actual: 18, predicted: 22, conf: 0.74 },
  { d: "9 Sep", actual: 24, predicted: 28, conf: 0.72 },
  { d: "10 Sep", actual: 31, predicted: 34, conf: 0.77 },
  { d: "11 Sep", actual: 42, predicted: 37, conf: 0.81 },
  { d: "12 Sep", actual: 35, predicted: 32, conf: 0.84 },
  { d: "13 Sep", actual: 27, predicted: 28, conf: 0.79 },
  { d: "14 Sep", actual: 21, predicted: 24, conf: 0.76 },
  { d: "15 Sep", actual: 19, predicted: 22, conf: 0.78 },
  { d: "16 Sep", actual: 23, predicted: 26, conf: 0.75 },
  { d: "17 Sep", actual: 30, predicted: 30, conf: 0.80 },
  { d: "18 Sep", actual: 36, predicted: 33, conf: 0.83 },
  { d: "19 Sep", actual: 28, predicted: 30, conf: 0.81 },
  { d: "20 Sep", actual: 22, predicted: 24, conf: 0.77 },
  { d: "21 Sep", actual: 17, predicted: 20, conf: 0.72 },
  { d: "22 Sep", actual: 14, predicted: 16, conf: 0.70 },
]

export const SYSTEMS: SystemRow[] = [
  { connector: "Cloud",   ico: "cloud",  workload: "alpha-core",       score: 87, threats: "Low",  patches: "2 pending",   state: "low" },
  { connector: "Server",  ico: "server", workload: "secure-db",        score: 92, threats: "Low",  patches: "Up to date",  state: "low" },
  { connector: "Lock",    ico: "lock",   workload: "beta-func-01",     score: 56, threats: "High", patches: "1 pending",   state: "high" },
  { connector: "Network", ico: "router", workload: "edge-gateway-07",  score: 74, threats: "Med",  patches: "Up to date",  state: "med" },
  { connector: "Cloud",   ico: "cloud",  workload: "vector-store-eu",  score: 81, threats: "Low",  patches: "3 pending",   state: "low" },
]

export const DEVICES: Device[] = [
  { name: "Aurora Hub",     type: "Router",   ico: "router",  mac: "9C·4F·02·EE·11", ip: "10.0.0.1",  online: true,  signal: 98, role: "Gateway" },
  { name: "Foyer Camera",   type: "Camera",   ico: "camera",  mac: "1A·22·08·B0·77", ip: "10.0.0.18", online: true,  signal: 71, role: "Sensor" },
  { name: "Studio Display", type: "Display",  ico: "tv",      mac: "44·CC·19·02·33", ip: "10.0.0.31", online: true,  signal: 84, role: "Endpoint" },
  { name: "Pixel 9 Pro",    type: "Phone",    ico: "phone",   mac: "8D·61·33·5A·91", ip: "10.0.0.42", online: true,  signal: 92, role: "Endpoint" },
  { name: "Kitchen Echo",   type: "Speaker",  ico: "speaker", mac: "7B·12·55·6D·12", ip: "10.0.0.65", online: false, signal: 0,  role: "IoT" },
  { name: "Garage Wear",    type: "Wearable", ico: "watch",   mac: "21·F8·D2·11·44", ip: "10.0.0.78", online: true,  signal: 48, role: "IoT" },
]

export const VULNS: Vuln[] = [
  { id: "CVE-2026-1042", title: "Privileged escalation in container runtime", severity: "Critical", score: 9.8, system: "alpha-core",       patch: "Available",  age: "2d" },
  { id: "CVE-2026-0987", title: "TLS handshake downgrade on edge proxy",      severity: "High",     score: 8.4, system: "edge-gateway-07", patch: "Available",  age: "5d" },
  { id: "CVE-2026-0921", title: "Improper input validation in auth module",   severity: "High",     score: 7.9, system: "beta-func-01",    patch: "Pending",    age: "8d" },
  { id: "CVE-2026-0844", title: "Race condition in scheduler",                severity: "Medium",   score: 6.1, system: "secure-db",       patch: "Available",  age: "11d" },
  { id: "CVE-2026-0810", title: "Out-of-bounds read in DNS resolver",         severity: "Medium",   score: 5.6, system: "edge-gateway-07", patch: "Available",  age: "14d" },
  { id: "CVE-2026-0772", title: "Open redirect on login screen",              severity: "Low",      score: 3.2, system: "vector-store-eu", patch: "Available",  age: "21d" },
  { id: "CVE-2026-0701", title: "Verbose error disclosure in API",            severity: "Low",      score: 2.8, system: "alpha-core",      patch: "Won't fix",  age: "30d" },
]

export const THREATS_FEED: ThreatEvent[] = [
  { sev: "Critical", source: "10.0.0.42",  title: "Repeated failed logins from Pixel 9 Pro",  desc: "12 attempts in 4 min · ssh:22",  time: "2 min ago",  region: "EU-West" },
  { sev: "High",     source: "edge-gw",    title: "Anomalous DNS traffic to unknown TLD",      desc: "3.2 MB out · *.cab.gangz",       time: "11 min ago", region: "EU-West" },
  { sev: "High",     source: "alpha-core", title: "Container escape attempt blocked",          desc: "syscall ptrace · ruleset 0x42",  time: "29 min ago", region: "US-East" },
  { sev: "Medium",   source: "vector-eu",  title: "Unusual outbound traffic pattern",          desc: "spike +180% vs baseline",        time: "1 hr ago",   region: "EU-West" },
  { sev: "Medium",   source: "router",     title: "Unrecognized device joined network",        desc: "MAC 22·1F·09·BB·12 · IoT",       time: "2 hr ago",   region: "Local" },
  { sev: "Low",      source: "secure-db",  title: "Slow query patterns from internal IP",      desc: "p99 +35% · 10.0.0.31",          time: "3 hr ago",   region: "EU-West" },
]

export const NETWORK_NODES: NetworkNode[] = [
  { id: "core",  x: 50, y: 50, label: "VANTA Core",   ico: "shield",  state: "ok",   meta: "10.0.0.1" },
  { id: "cloud", x: 18, y: 24, label: "Cloud Edge",   ico: "cloud",   state: "ok",   meta: "us-east-2" },
  { id: "gw",    x: 78, y: 22, label: "Edge Gateway", ico: "router",  state: "warn", meta: "10.0.0.7" },
  { id: "db",    x: 14, y: 76, label: "Secure DB",    ico: "server",  state: "ok",   meta: "10.0.0.31" },
  { id: "auth",  x: 82, y: 78, label: "Auth Module",  ico: "lock",    state: "red",  meta: "beta-func-01" },
  { id: "phone", x: 35, y: 85, label: "Pixel 9 Pro",  ico: "phone",   state: "red",  meta: "10.0.0.42" },
  { id: "cam",   x: 65, y: 90, label: "Foyer Cam",    ico: "camera",  state: "ok",   meta: "10.0.0.18" },
  { id: "globe", x: 50, y: 12, label: "Internet",     ico: "globe",   state: "blue", meta: "ASN 4242" },
]

export const NETWORK_EDGES: NetworkEdge[] = [
  ["globe", "core"], ["cloud", "core"], ["gw", "core"], ["db", "core"],
  ["auth", "core"],  ["phone", "core"], ["cam", "core"], ["gw", "cloud"], ["auth", "gw"],
]
