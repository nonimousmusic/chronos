import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, ArrowRight, Monitor, Shield, AlertTriangle, Download, Bed, LayoutDashboard, LucideIcon } from 'lucide-react'

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  action: string;
}

const COMMANDS: Command[] = [
  { id: 'chronos', label: 'Switch to Chronos', hint: 'ICU Simulation Dashboard', icon: Monitor, action: 'nav:chronos' },
  { id: 'command', label: 'Switch to Command Center', hint: 'View ICU Operations', icon: LayoutDashboard, action: 'nav:command' },
  { id: 'sentinel', label: 'Switch to Sentinel', hint: 'Surgical Black Box', icon: Shield, action: 'nav:sentinel' },
  { id: 'bed4', label: 'Show Bed 4', hint: 'Jump to patient in Bed 4', icon: Bed, action: 'nav:chronos' },
  { id: 'bed7', label: 'Show Bed 7', hint: 'Jump to patient in Bed 7', icon: Bed, action: 'nav:chronos' },
  { id: 'highrisk', label: 'Filter High-Risk Patients', hint: 'Show patients above 70% crash probability', icon: AlertTriangle, action: 'nav:chronos' },
  { id: 'tamper', label: 'Simulate Tamper', hint: 'Trigger a cryptographic breach simulation', icon: Shield, action: 'nav:sentinel' },
  { id: 'export', label: 'Export Black Box Log', hint: 'Download telemetry as JSON', icon: Download, action: 'export' },
]

interface CommandPaletteProps {
  onClose: () => void;
  onNavigate: (viewId: string) => void;
}

export default function CommandPalette({ onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.hint.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (cmd: Command) => {
    if (cmd.action.startsWith('nav:')) {
      onNavigate(cmd.action.replace('nav:', ''))
      onClose()
    } else if (cmd.action === 'export') {
      // Trigger download of sample data
      const blob = new Blob([JSON.stringify({ message: 'Black Box Log Export' })], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'black_box_log.json'
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          zIndex: 9998,
        }}
      />

      {/* Palette */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '540px',
          maxWidth: '90vw',
          background: 'var(--toast-bg)',
          backdropFilter: 'blur(40px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          zIndex: 9999,
          overflow: 'hidden',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <Search size={18} color="var(--text-secondary)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
            }}
          />
          <kbd style={{
            background: 'rgba(255,255,255,0.06)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '320px', overflow: 'auto', padding: '8px' }}>
          {filtered.map((cmd) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-display)',
                  fontSize: '14px',
                  transition: 'var(--transition-fast)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-item-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={16} color="var(--text-secondary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{cmd.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{cmd.hint}</div>
                </div>
                <ArrowRight size={14} color="var(--text-dim)" />
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
              No commands found
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
