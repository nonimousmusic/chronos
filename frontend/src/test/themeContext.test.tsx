import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'

function TestConsumer() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>Toggle</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides a default theme', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme')).toBeDefined()
  })

  it('renders children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">hello</div>
      </ThemeProvider>,
    )
    expect(screen.getByTestId('child')).toBeDefined()
  })
})
