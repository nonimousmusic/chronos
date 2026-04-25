import React from 'react'

export interface DetailSectionProps {
  label: string
  value?: string | null
  color?: string
  large?: boolean
  italic?: boolean
  fallback?: string
}

export function DetailSection({ label, value, color, large, italic, fallback }: DetailSectionProps) {
  const displayValue = value || fallback || '—'
  return (
    <div className="mb-1">
      <div className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1 font-bold uppercase">
        {label}
      </div>
      <div 
        className={`${large ? 'text-[17px] font-bold' : 'text-[14px] font-medium'} leading-relaxed`}
        style={{ 
          color: color || (large ? '#fff' : 'var(--text-primary)'),
          fontStyle: italic ? 'italic' : 'normal',
          opacity: value ? 1 : 0.6
        }}
      >
        {displayValue}
      </div>
    </div>
  )
}

export const tagStyle = "text-[9px] font-mono px-[6px] py-[2px] rounded-full bg-[var(--badge-bg)] text-[var(--text-dim)]"

export function isWithinShift(start: string, end: string, current: string): boolean {
  if (!start || !end) return false
  const s = start.replace(':', '')
  const e = end.replace(':', '')
  const c = current.replace(':', '')
  if (s < e) return c >= s && c < e
  return c >= s || c < e // overnight shift
}

export function smallBtnStyle(color: string) {
  return {
    padding: '3px 10px', 
    borderRadius: 'var(--radius-full)', 
    border: `1px solid ${color}44`,
    background: `${color}12`, 
    color, 
    cursor: 'pointer',
    fontSize: '9px', 
    fontWeight: 700, 
    fontFamily: 'var(--font-mono)', 
    letterSpacing: '0.5px',
  } as React.CSSProperties
}
