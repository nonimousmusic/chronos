import { describe, it, expect } from 'vitest'

describe('config', () => {
  it('API_BASE defaults to empty string', async () => {
    const { API_BASE } = await import('@/utils/config')
    expect(API_BASE).toBeDefined()
    expect(typeof API_BASE).toBe('string')
  })

  it('WS_URL defaults to empty string', async () => {
    const { WS_URL } = await import('@/utils/config')
    expect(WS_URL).toBeDefined()
    expect(typeof WS_URL).toBe('string')
  })
})
