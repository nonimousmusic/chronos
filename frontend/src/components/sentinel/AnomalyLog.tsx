import { Anomaly } from '@/types'

interface AnomalyLogProps {
  anomalies: Anomaly[]
  onJump: (timestamp: number) => void
}

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

export default function AnomalyLog({ anomalies = [], onJump }: AnomalyLogProps) {
  return (
    <div className="glass" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minHeight: 0,
    }}>
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
            AI ANOMALY LOG
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>Detected Events</div>
        </div>
        <div style={{
          background: 'var(--color-critical-bg)',
          padding: '3px 10px',
          borderRadius: 100,
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-critical)',
          border: '1px solid rgba(255, 45, 85, 0.2)',
        }}>
          {anomalies.length}
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}>
        {anomalies.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
            No anomalies detected yet. Play the video to see AI detections.
          </div>
        )}

        {anomalies.map((a, i) => (
          <div
            key={`${a.timestamp}-${i}`}
            className="opacity-100"
          >
            {a.tags.map((tag, j) => {
              const color = tag.type === 'HR_SPIKE' ? 'var(--color-critical)' :
                            tag.type === 'SPO2_DROP' ? 'var(--accent-blue)' :
                            'var(--color-observing)'
              return (
                <button
                  key={j}
                  onClick={() => onJump(a.timestamp)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    marginBottom: '6px',
                    background: 'transparent',
                    borderLeft: `3px solid ${color}`,
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    borderRadius: '0 8px 8px 0',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    transition: '0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${color}11` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color,
                    marginBottom: '3px',
                  }}>
                    {formatTime(a.timestamp)}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>
                    {tag.message}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--text-dim)',
                    marginTop: '4px',
                    lineHeight: 1.4,
                  }}>
                    {tag.reason}
                  </div>
                  <div style={{
                    fontSize: '8px',
                    color,
                    opacity: 0.5,
                    marginTop: '4px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}>
                    Click to jump directly to event
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
