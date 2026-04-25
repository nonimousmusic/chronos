import { motion } from 'framer-motion'
// import { useState } from 'react'
// import { API_BASE } from '../../utils/config'

export interface TamperMode {
  id: string;
  label: string;
  desc: string;
}

export const TAMPER_MODES: TamperMode[] = [
  { id: 'modify_vitals', label: '💉 Modify Vitals', desc: 'Increase HR by +20 BPM' },
  { id: 'modify_frame', label: '🖼 Corrupt Frame', desc: 'Overwrite bytes 100-200' },
  { id: 'delete_frame', label: '🗑 Delete Frame', desc: 'Remove JPEG from disk' },
  { id: 'reorder', label: '🔀 Reorder Attack', desc: 'Swap vitals with next record' },
]

interface TamperInfo {
  mode?: string;
  seq?: number;
  session_id?: string;
  expected?: string;
  got?: string;
}

interface TamperSimulatorProps {
  tamperInfo?: TamperInfo | null;
  onTamper?: ((sessionId: string, seq: number) => void) | null;
}

export default function TamperSimulator({ tamperInfo = null }: TamperSimulatorProps) {
  // const [selectedMode, setSelectedMode] = useState('modify_vitals')
  // const [tamperResult, setTamperResult] = useState(null)

  /*
  async function executeTamper(sessionId: string, seq: number) {
    try {
      const res = await fetch(
        `${API_BASE}/api/tamper/${sessionId}/${seq}?mode=${selectedMode}`,
        { method: 'POST' }
      )
      if (res.ok) {
        const data = await res.json()
        setTamperResult(data)
      }
    } catch (e) {
      console.error('Tamper failed:', e)
    }
  }
  */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 45, 85, 0.08)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      } as any}
    >
      {/* Scanline effect */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,45,85,0.03) 2px, rgba(255,45,85,0.03) 4px)',
        animation: 'breach-pulse 0.5s infinite',
      } as any} />

      {/* Main alert */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{
          fontSize: '64px',
          lineHeight: 1,
        }}>🚨</div>

        <div className="glitch-text" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '42px',
          fontWeight: 800,
          color: 'var(--color-critical)',
          textShadow: '0 0 40px rgba(255, 45, 85, 0.6), 0 0 80px rgba(255, 45, 85, 0.3)',
          letterSpacing: '-1px',
          textAlign: 'center',
        } as any}>
          SECURITY BREACH
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          color: 'rgba(255, 45, 85, 0.8)',
          letterSpacing: '3px',
          animation: 'breach-pulse 0.8s infinite',
        } as any}>
          HASH CHAIN INTEGRITY COMPROMISED
        </div>

        {/* Tamper mode details */}
        {tamperInfo && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-dim)',
            marginTop: '8px',
            letterSpacing: '1px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          } as any}>
            <div>MODE: {tamperInfo.mode?.toUpperCase() || 'UNKNOWN'}</div>
            <div>SEQ: {tamperInfo.seq ?? 'N/A'} | SESSION: {tamperInfo.session_id?.slice(0, 8) || '???'}...</div>
            {tamperInfo.expected && tamperInfo.got && (
              <>
                <div style={{ color: 'var(--color-stable)' }}>
                  EXPECTED: {tamperInfo.expected?.slice(0, 24)}...
                </div>
                <div style={{ color: 'var(--color-critical)' }}>
                  GOT: {tamperInfo.got?.slice(0, 24)}...
                </div>
              </>
            )}
          </div>
        )}

        {!tamperInfo && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-dim)',
            marginTop: '8px',
            letterSpacing: '1px',
          } as any}>
            TAMPER DETECTED AT FRAME 847 / BLOCK 0x3fa2...e9c1
          </div>
        )}
      </motion.div>

      {/* Corner warnings */}
      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(pos => {
        const [v, h] = pos.split('-')
        return (
          <div key={pos} style={{
            position: 'absolute',
            [v]: '20px',
            [h]: '20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--color-critical)',
            opacity: 0.6,
            letterSpacing: '1px',
            animation: 'breach-pulse 0.6s infinite',
          } as any}>
            ⚠ ALERT
          </div>
        )
      })}
    </motion.div>
  )
}
