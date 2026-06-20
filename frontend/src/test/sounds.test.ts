import { describe, it, expect } from 'vitest'

describe('sounds', () => {
  it('exports expected functions', async () => {
    const mod = await import('@/utils/sounds')
    expect(mod.playNavClick).toBeDefined()
    expect(mod.playPaletteOpen).toBeDefined()
    expect(typeof mod.playNavClick).toBe('function')
    expect(typeof mod.playPaletteOpen).toBe('function')
  })
})
