import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Icon } from './Icon'

describe('Icon', () => {
  it('renders an svg for a known name', () => {
    const { container } = render(<Icon name="shield" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  it('falls back to the default svg for an unknown name', () => {
    const { container } = render(<Icon name="not-a-real-icon" />)
    expect(container.querySelector('svg circle')).not.toBeNull()
  })

  it('applies the size prop', () => {
    const { container } = render(<Icon name="grid" size={32} />)
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('32')
  })
})
