import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HealthGauge, ThreatForecast, Sparkline, NetActivity } from './charts'
import { FORECAST } from '../data'

describe('charts', () => {
  it('Sparkline draws a polyline', () => {
    const { container } = render(<Sparkline data={[1, 4, 2, 8, 5]} />)
    expect(container.querySelector('polyline')).not.toBeNull()
  })

  it('HealthGauge renders an svg', () => {
    const { container } = render(<HealthGauge value={76} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('ThreatForecast renders the actual + predicted paths', () => {
    const { container } = render(<ThreatForecast data={FORECAST} />)
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(2)
  })

  it('NetActivity renders without crashing', () => {
    const { container } = render(<NetActivity />)
    expect(container.querySelector('.map')).not.toBeNull()
  })
})
