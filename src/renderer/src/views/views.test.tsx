import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardView } from './DashboardView'
import { NetworkView } from './NetworkView'
import { VulnerabilitiesView } from './VulnerabilitiesView'
import { DevicesView } from './DevicesView'
import { ThreatsView } from './ThreatsView'
import { AlertsView } from './AlertsView'
import { StubView } from './StubView'

beforeEach(() => {
  ;(window as unknown as { vanta: unknown }).vanta = {
    ping: () => Promise.resolve('pong'),
    devices: { list: () => Promise.resolve([]), subscribe: () => () => {} },
    stats: {
      current: () => Promise.resolve({ rxMbps: 0, txMbps: 0, rxHistory: [], txHistory: [] }),
      subscribe: () => () => {}
    },
    scan: {
      run: () => Promise.resolve(),
      current: () => Promise.resolve({ scanning: false, lastScanAt: null, nmapAvailable: false, vulns: [], hosts: [] }),
      subscribe: () => () => {}
    },
    threats: {
      current: () => Promise.resolve({ events: [], activeCount: 0, lastUpdated: null }),
      subscribe: () => () => {}
    }
  }
})

describe('views render with prototype data', () => {
  it('Dashboard shows its cards', () => {
    render(<DashboardView />)
    expect(screen.getByText('System Health')).toBeInTheDocument()
    expect(screen.getByText('Threat Trend')).toBeInTheDocument()
    expect(screen.getByText('Connected Systems')).toBeInTheDocument()
  })
  it('Network shows the topology card', () => {
    render(<NetworkView />)
    expect(screen.getByText('Network Topology')).toBeInTheDocument()
  })
  it('Vulnerabilities shows the active table', () => {
    render(<VulnerabilitiesView />)
    expect(screen.getByText('Active Vulnerabilities')).toBeInTheDocument()
  })
  it('Devices lists connected devices', () => {
    render(<DevicesView />)
    expect(screen.getByText('Connected Devices')).toBeInTheDocument()
  })
  it('Threats shows the live feed', () => {
    render(<ThreatsView />)
    expect(screen.getByText('Live Threat Feed')).toBeInTheDocument()
  })
  it('Alerts shows the incidents card', () => {
    render(<AlertsView />)
    expect(screen.getByText('Alerts & Incidents')).toBeInTheDocument()
  })
  it('Stub shows its title and message', () => {
    render(<StubView title="Settings" msg="hello" />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})
