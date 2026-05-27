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
    fireEvent.click(screen.getByText('Network'))
    expect(screen.getByText('Network Topology')).toBeInTheDocument()
  })
})
