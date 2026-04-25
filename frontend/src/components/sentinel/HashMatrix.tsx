import { useMemo, useEffect, useRef } from 'react'

interface AuditTrailEntry {
  timestamp: number;
  data_hash?: string;
  prev_hash?: string;
  [key: string]: any;
}

interface HashMatrixProps {
  auditTrail: AuditTrailEntry[];
  currentIdx: number;
  tamperActive?: boolean;
  finalHash?: string;
  liveMode?: boolean;
}

export default function HashMatrix({ auditTrail, currentIdx, tamperActive, finalHash, liveMode = false }: HashMatrixProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      if (liveMode) {
        // Auto-scroll to bottom in live mode to show latest hashes
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      } else {
        scrollRef.current.scrollTop = 0
      }
    }
  }, [currentIdx, liveMode, auditTrail.length])

  const visibleHashes = useMemo(() => {
    return auditTrail.slice(Math.max(0, currentIdx - 30), currentIdx + 1).reverse()
  }, [auditTrail, currentIdx])

  const selectedEntry = visibleHashes[0] || null

  return (
    <div className="glass" style={{
      display: 'flex',
      flexDirection: 'column',
      flex: '0 0 auto',
      maxHeight: '45%',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      } as any}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
            CRYPTOGRAPHIC TRAIL
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>Live Hash Matrix</div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: tamperActive ? 'var(--color-critical)' : 'var(--color-stable)',
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          background: tamperActive ? 'var(--color-critical-bg)' : 'var(--color-stable-bg)',
          border: `1px solid ${tamperActive ? 'var(--color-critical)' : 'var(--color-stable)'}33`,
        } as any}>
          {tamperActive ? '✗ BROKEN' : '✓ CHAINED'}
        </div>
      </div>

      {/* Chain formula */}
      <div style={{
        margin: '8px 14px 0',
        padding: '6px 10px',
        background: 'rgba(99, 102, 241, 0.06)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--text-secondary)',
        letterSpacing: '0.5px',
      } as any}>
        H[n] = SHA256(canonical_json(&#123;seq, ts, frame_sha256, vitals, prev_hash&#125;))
      </div>

      {/* Hash Summary */}
      <div style={{
        margin: '8px 14px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {/* Genesis Block */}
        <div style={{
          padding: '8px 10px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          overflow: 'hidden'
        } as any}>
          <div style={{
            fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
            fontWeight: 700, letterSpacing: '1px', marginBottom: '2px',
          } as any}>GENESIS HASH [00000]</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px', wordBreak: 'break-all',
            color: 'var(--text-secondary)'
          } as any}>{auditTrail.length > 0 ? (auditTrail[0].data_hash?.slice(0, 16) + '...') : 'AWAITING GENESIS...'}</div>
        </div>

        {/* Latest Block */}
        <div style={{
          padding: '8px 10px',
          background: tamperActive ? 'rgba(255,45,85,0.08)' : 'rgba(0, 255, 163, 0.05)',
          border: `1px solid ${tamperActive ? 'rgba(255,45,85,0.3)' : 'rgba(0, 255, 163, 0.2)'}`,
          borderRadius: 'var(--radius-sm)',
          transition: 'all 0.2s',
        } as any}>
          <div style={{
            fontSize: '9px', fontFamily: 'var(--font-mono)',
            color: tamperActive ? 'var(--color-critical)' : 'var(--color-stable)',
            fontWeight: 700, letterSpacing: '1px', marginBottom: '2px',
            display: 'flex', justifyContent: 'space-between'
          } as any}>
            <span>LATEST HASH [{currentIdx.toString().padStart(5, '0')}]</span>
            {tamperActive && <span style={{ animation: 'pulse-dot 1s infinite' }}>⚠ CORRUPTED</span>}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px', wordBreak: 'break-all',
            color: tamperActive ? 'var(--color-critical)' : 'var(--text-primary)',
            textDecoration: tamperActive ? 'line-through' : 'none',
            opacity: tamperActive ? 0.8 : 1
          } as any}>
            {tamperActive ? '0xef4d... [ALTERED] ...f1c9' : (finalHash ? `${finalHash.slice(0, 12)}...${finalHash.slice(-8)}` : 'N/A')}
          </div>
        </div>
      </div>

      {/* Selected Entry: Prev/Current detail */}
      {selectedEntry && (
        <div style={{
          margin: '6px 14px 0',
          padding: '6px 10px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        } as any}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
              fontWeight: 700, letterSpacing: '1px', width: 48, flexShrink: 0,
            } as any}>PREV</span>
            <span style={{
              fontSize: '8px', fontFamily: 'var(--font-mono)', wordBreak: 'break-all',
              color: 'var(--text-secondary)',
            } as any}>
              {selectedEntry.prev_hash ? `${selectedEntry.prev_hash.slice(0, 16)}...` : '0'.repeat(16) + '...'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: '8px', fontFamily: 'var(--font-mono)',
              color: tamperActive ? 'var(--color-critical)' : 'var(--color-stable)',
              fontWeight: 700, letterSpacing: '1px', width: 48, flexShrink: 0,
            } as any}>CURR</span>
            <span style={{
              fontSize: '8px', fontFamily: 'var(--font-mono)', wordBreak: 'break-all',
              color: tamperActive ? 'var(--color-critical)' : 'var(--text-primary)',
            } as any}>
              {selectedEntry.data_hash ? `${selectedEntry.data_hash.slice(0, 16)}...` : 'N/A'}
            </span>
          </div>
          <div style={{
            fontSize: '8px', fontFamily: 'var(--font-mono)', textAlign: 'right',
            color: tamperActive ? 'var(--color-critical)' : 'var(--color-stable)',
            fontWeight: 700,
          } as any}>
            {tamperActive ? '✗ BROKEN CHAIN LINK' : '✔ Valid Chain Link'}
          </div>
        </div>
      )}

      {/* Off-chain / On-chain labels */}
      <div style={{
        margin: '6px 14px 0',
        display: 'flex',
        gap: '6px',
      }}>
        <div style={{
          flex: 1, padding: '5px 8px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)',
          display: 'flex', flexDirection: 'column', gap: 2,
        } as any}>
          <span style={{ fontSize: '7px', fontFamily: 'var(--font-mono)', color: '#818cf8', fontWeight: 700, letterSpacing: '1px' }}>
            OFF-CHAIN (IPFS)
          </span>
          <span style={{ fontSize: '7px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            QmX7d...fP3r
          </span>
        </div>
        <div style={{
          flex: 1, padding: '5px 8px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)',
          display: 'flex', flexDirection: 'column', gap: 2,
        } as any}>
          <span style={{ fontSize: '7px', fontFamily: 'var(--font-mono)', color: '#f59e0b', fontWeight: 700, letterSpacing: '1px' }}>
            ON-CHAIN (Polygon)
          </span>
          <span style={{ fontSize: '7px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            0xCHAIN_anchor...
          </span>
        </div>
      </div>

      {/* Hash chain scroll */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 14px',
          maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
        } as any}
      >
        {visibleHashes.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              lineHeight: 1.8,
              color: tamperActive
                ? (i % 3 === 0 ? 'var(--color-critical)' : 'var(--text-dim)')
                : (i === 0 ? 'var(--color-stable)' : 'var(--text-dim)'),
              textShadow: !tamperActive && i === 0 ? '0 0 6px rgba(52, 211, 153, 0.5)' : 'none',
              animation: !tamperActive && i === 0 ? 'typewriter-glow 2s ease-out' : 'none',
              textDecoration: tamperActive && i % 3 === 0 ? 'line-through' : 'none',
              opacity: tamperActive && i % 2 === 0 ? 0.4 : 1,
              transition: 'all 0.3s',
            } as any}
          >
            {entry.data_hash ? (entry.data_hash.slice(0, 16) + '...') : 'NULL'}
          </div>
        ))}
      </div>
    </div>
  )
}
