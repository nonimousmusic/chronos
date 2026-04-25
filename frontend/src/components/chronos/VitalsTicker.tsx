import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { Heart, Wind, Droplets, Activity, Thermometer, LucideIcon } from 'lucide-react'
import { Vitals } from '@/types'

interface VitalConfigItem {
  key: keyof Vitals;
  label: string;
  unit: string;
  icon: LucideIcon;
  color: string;
  critical: (v: number) => boolean;
}

const VITAL_CONFIG: VitalConfigItem[] = [
  { key: 'heart_rate', label: 'Heart Rate', unit: 'BPM', icon: Heart, color: 'var(--accent-red)', critical: v => v > 110 || v < 50 },
  { key: 'spo2', label: 'SpO2', unit: '%', icon: Droplets, color: 'var(--accent-blue)', critical: v => v < 92 },
  { key: 'map', label: 'MAP', unit: 'mmHg', icon: Activity, color: 'var(--accent-purple)', critical: v => v < 60 },
  { key: 'lactate', label: 'Lactate', unit: 'mmol/L', icon: Thermometer, color: 'var(--accent-amber)', critical: v => v > 2.0 },
  { key: 'respiratory_rate', label: 'Resp. Rate', unit: '/min', icon: Wind, color: 'var(--accent-green)', critical: v => v > 30 },
]

interface VitalsTickerProps {
  vitals: Vitals;
  history: Vitals[];
  status: string;
}

export default function VitalsTicker({ vitals, history }: VitalsTickerProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '12px',
    }}>
      {VITAL_CONFIG.map(cfg => {
        const value = vitals[cfg.key] as number
        const isCritical = cfg.critical(value)
        const Icon = cfg.icon
        const sparkData = history.map(h => ({ v: h[cfg.key] }))

        return (
          <div
            key={cfg.key}
            className="glass"
            style={{
              padding: '14px 16px',
              position: 'relative',
              overflow: 'hidden',
              borderColor: isCritical ? `color-mix(in srgb, ${cfg.color}, transparent 70%)` : 'var(--color-border-subtle)',
              transition: 'var(--transition-smooth)',
            } as any}
          >
            {/* Glow effect when critical */}
            {isCritical && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at center, color-mix(in srgb, ${cfg.color}, transparent 85%), transparent 70%)`,
                pointerEvents: 'none',
              }} />
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon size={12} color={isCritical ? cfg.color : 'var(--color-text-tertiary)'} />
                <span style={{
                  fontSize: '10px',
                  color: 'var(--color-text-tertiary)',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}>{cfg.label}</span>
              </div>
              {isCritical && (
                <div style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: cfg.color,
                  animation: 'pulse-dot 1s infinite',
                }} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
              <span
                className={`${cfg.key === 'heart_rate' ? 'animate-heartbeat' : ''} counter-update`}
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: isCritical ? cfg.color : 'var(--color-text-primary)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-1px',
                  lineHeight: '28px',
                  animationDuration: cfg.key === 'heart_rate' ? `${60 / value}s` : undefined
                } as any}>
                {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : '--'}
              </span>
              <span style={{
                fontSize: '11px',
                color: 'var(--color-text-tertiary)',
              }}>{cfg.unit}</span>
            </div>

            {/* Mini sparkline */}
            <div style={{ height: '28px', marginTop: '8px', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={28}>
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id={`grad-${cfg.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`color-mix(in srgb, ${cfg.color}, white 20%)`} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={cfg.color}
                    fillOpacity={1}
                    fill={`url(#grad-${cfg.key})`}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}
