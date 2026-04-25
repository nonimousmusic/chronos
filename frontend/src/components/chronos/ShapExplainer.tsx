import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts'

export interface FeatureItem {
  feature: string;
  value: number;
  direction: 'risk' | 'protective';
}

interface ShapExplainerProps {
  features: FeatureItem[];
  patientId: string;
  isLive?: boolean;
}

export default function ShapExplainer({ features, patientId, isLive = false }: ShapExplainerProps) {
  const data = features.map(f => ({
    name: f.feature,
    value: f.value,
    direction: f.direction,
  })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
            EXPLAINABLE AI
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
            Why This Prediction? <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, fontSize: '12px' }}>SHAP Feature Contributions</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '1px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: isLive ? 'rgba(45, 212, 191, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: isLive ? 'var(--color-brand-accent)' : 'var(--color-text-tertiary)',
            border: `1px solid ${isLive ? 'rgba(45, 212, 191, 0.3)' : 'rgba(255,255,255,0.08)'}`,
          } as any}>{isLive ? '● LIVE ML' : 'REFERENCE'}</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-tertiary)',
            background: 'rgba(255,255,255,0.03)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
          }}>{patientId}</div>
        </div>
      </div>

      <div style={{ minWidth: '100%', height: '140px', marginTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[-0.4, 0.4]} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 600, letterSpacing: '1px' }}
            width={130}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={8}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.direction === 'risk' ? 'var(--color-status-critical)' : 'var(--color-status-stable)'}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div style={{
        display: 'flex',
        gap: '16px',
        marginTop: '6px',
        justifyContent: 'center',
      }}>
        <Legend color="var(--color-status-critical)" label="Risk Driver" />
        <Legend color="var(--color-status-stable)" label="Protective" />
      </div>
    </div>
  )
}

interface LegendProps {
  color: string;
  label: string;
}

function Legend({ color, label }: LegendProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, opacity: 0.7 }} />
      <span style={{ fontSize: '9px', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>{label}</span>
    </div>
  )
}
