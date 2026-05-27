import type { DeviceClass } from '@shared/types'

export interface ClassifyInput {
  isGateway: boolean
  vendor: string | null
  services: string[]
  hostname: string | null
}

export interface Classification {
  deviceClass: DeviceClass
  type: string
  role: string
  ico: string
}

// DeviceClass -> existing Icon name (see src/renderer/src/components/Icon.tsx).
const ICON: Record<DeviceClass, string> = {
  router: 'router', server: 'server', phone: 'phone', tv: 'tv', camera: 'camera',
  speaker: 'speaker', watch: 'watch', laptop: 'cpu', printer: 'server',
  iot: 'cpu', unknown: 'globe'
}
const TYPE_LABEL: Record<DeviceClass, string> = {
  router: 'Router', server: 'Server', phone: 'Phone', tv: 'Display', camera: 'Camera',
  speaker: 'Speaker', watch: 'Wearable', laptop: 'Computer', printer: 'Printer',
  iot: 'IoT', unknown: 'Unknown'
}
const ROLE: Record<DeviceClass, string> = {
  router: 'Gateway', server: 'Server', phone: 'Endpoint', tv: 'Endpoint',
  camera: 'Sensor', speaker: 'IoT', watch: 'IoT', laptop: 'Endpoint',
  printer: 'Peripheral', iot: 'IoT', unknown: 'Endpoint'
}

const SERVICE_CLASS: Array<[RegExp, DeviceClass]> = [
  [/_airplay|_raop|_googlecast/i, 'tv'],
  [/_ipp|_printer|_pdl-datastream/i, 'printer'],
  [/_spotify-connect|_sonos/i, 'speaker'],
  [/_ssh|_sftp-ssh|_smb|_afpovertcp|_nfs/i, 'server'],
  [/_homekit|_hap|_miio/i, 'iot']
]
const VENDOR_CLASS: Array<[RegExp, DeviceClass]> = [
  [/apple/i, 'phone'],
  [/google|nest/i, 'iot'],
  [/amazon/i, 'speaker'],
  [/ubiquiti|netgear|tp-link|asus|cisco|d-link/i, 'router'],
  [/hp|canon|epson|brother/i, 'printer'],
  [/raspberry/i, 'server']
]

export function labelsFor(deviceClass: DeviceClass): { ico: string; type: string; role: string } {
  return { ico: ICON[deviceClass], type: TYPE_LABEL[deviceClass], role: ROLE[deviceClass] }
}

export function classify(input: ClassifyInput): Classification {
  const cls = classifyClass(input)
  return { deviceClass: cls, ...labelsFor(cls) }
}

function classifyClass(input: ClassifyInput): DeviceClass {
  if (input.isGateway) return 'router'
  for (const svc of input.services) {
    for (const [re, cls] of SERVICE_CLASS) if (re.test(svc)) return cls
  }
  if (input.vendor) {
    for (const [re, cls] of VENDOR_CLASS) if (re.test(input.vendor)) return cls
  }
  if (input.hostname && /iphone|ipad|android|pixel|phone/i.test(input.hostname)) return 'phone'
  return 'unknown'
}
