import { describe, it, expect } from 'vitest'
import { classify } from './classify'

describe('classify', () => {
  it('classifies the gateway as a router', () => {
    expect(classify({ isGateway: true, vendor: null, services: [], hostname: null }).deviceClass).toBe('router')
  })
  it('uses mDNS service types', () => {
    expect(classify({ isGateway: false, vendor: null, services: ['_airplay._tcp'], hostname: null }).deviceClass).toBe('tv')
    expect(classify({ isGateway: false, vendor: null, services: ['_ipp._tcp'], hostname: null }).deviceClass).toBe('printer')
  })
  it('falls back to vendor hints, then unknown', () => {
    expect(classify({ isGateway: false, vendor: 'Apple, Inc.', services: [], hostname: 'iphone.local' }).deviceClass).toBe('phone')
    expect(classify({ isGateway: false, vendor: null, services: [], hostname: null }).deviceClass).toBe('unknown')
  })
  it('maps each class to an existing icon name', () => {
    expect(classify({ isGateway: true, vendor: null, services: [], hostname: null }).ico).toBe('router')
  })
})
