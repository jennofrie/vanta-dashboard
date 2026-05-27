import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the brand and the dashboard by default', () => {
    render(<App />)
    expect(screen.getByText('VANTA')).toBeInTheDocument()
    expect(screen.getByText('System Health')).toBeInTheDocument()
  })

  it('switches to the Network view when its nav item is clicked', () => {
    render(<App />)
    // Scope to the sidebar label: the default Dashboard also renders a
    // "Network" connector row in the Connected Systems table.
    fireEvent.click(screen.getByText('Network', { selector: '.nav-item span' }))
    expect(screen.getByText('Network Topology')).toBeInTheDocument()
  })
})
