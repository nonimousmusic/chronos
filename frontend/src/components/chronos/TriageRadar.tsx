import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Activity, Zap, LucideIcon } from 'lucide-react'
import { Patient } from '@/types'

interface TriageRadarProps {
  patients: Patient[];
  selected: Patient;
  onSelect: (patient: Patient) => void;
}

export default function TriageRadar({ patients, selected, onSelect }: TriageRadarProps) {
  const sorted = [...patients].sort((a, b) => b.aggregateRisk - a.aggregateRisk)

  return (
    <div className="glass" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 12px',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
            TRIAGE RADAR
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
            Patient Risk Ranking
          </div>
        </div>
        <div style={{
          background: 'color-mix(in srgb, var(--color-status-critical) 15%, transparent)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-status-critical)',
        }}>
          {patients.filter(p => p.status === 'critical').length} CRITICAL
        </div>
      </div>

      {/* Patient List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}>
        {sorted.map((patient, i) => (
          <motion.div
            key={patient.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <PatientCard
              patient={patient}
              isSelected={selected.id === patient.id}
              onClick={() => onSelect(patient)}
              rank={i + 1}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

interface PatientCardProps {
  patient: Patient;
  isSelected: boolean;
  onClick: () => void;
  rank: number;
}

function PatientCard({ patient, isSelected, onClick, rank }: PatientCardProps) {
  const borderColor = patient.status === 'critical'
    ? 'var(--color-status-critical)'
    : patient.status === 'observing'
    ? 'var(--color-observing)'
    : 'var(--color-status-stable)'

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        marginBottom: '6px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isSelected ? borderColor : 'var(--color-border-subtle)'}`,
        background: isSelected ? `${borderColor}11` : 'transparent',
        cursor: 'pointer',
        transition: 'var(--transition-smooth)',
        fontFamily: 'var(--font-display)',
        color: 'var(--color-text-primary)',
        position: 'relative',
        overflow: 'hidden',
      } as any}
    >
      {/* Left border accent */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '3px',
        background: borderColor,
        opacity: isSelected ? 1 : 0.3,
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', opacity: 0.5, fontFamily: 'var(--font-mono)', width: '18px' }}>
            #{rank}
          </span>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Bed {patient.bed}</span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{patient.name}</span>
          <span style={{ 
            fontSize: '8px', fontWeight: 800, fontFamily: 'var(--font-mono)',
            padding: '2px 6px', borderRadius: '4px', background: `${borderColor}22`, color: borderColor,
            letterSpacing: '0.5px'
          }}>
            {patient.status === 'critical' ? '2H' : patient.status === 'observing' ? '6H' : '12H'}
          </span>
        </div>
        <RiskBadge value={patient.aggregateRisk} status={patient.status as any} />
      </div>

      {/* Reason */}
      <div style={{
        fontSize: '11px',
        color: 'var(--color-text-secondary)',
        marginTop: '6px',
        marginLeft: '36px',
      }}>
        {patient.admitReason}
      </div>

      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '10px', marginLeft: '36px' }}
          >
            <RiskBar label="Shock" value={patient.riskScores.shock} icon={Zap} labelWidth="70px" />
            <RiskBar label="Sepsis" value={patient.riskScores.sepsis} icon={Activity} labelWidth="70px" />
            <RiskBar label="Deterioration" value={patient.riskScores.deterioration} icon={AlertTriangle} labelWidth="70px" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

interface RiskBadgeProps {
  value: number;
  status: 'critical' | 'observing' | 'stable';
}

function RiskBadge({ value, status }: RiskBadgeProps) {
  const color = status === 'critical' ? 'var(--color-status-critical)'
    : status === 'observing' ? 'var(--color-observing)'
    : 'var(--color-status-stable)'

  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
      fontWeight: 700,
      color,
      animation: status === 'critical' ? 'pulse-critical 1.5s infinite' : 'none',
      padding: '2px 8px',
      borderRadius: 'var(--radius-sm)',
      background: `${color}15`,
    } as any}>
      {Math.round(value * 100)}%
    </span>
  )
}

interface RiskBarProps {
  label: string;
  value: number;
  icon: LucideIcon;
  labelWidth?: string;
}

function RiskBar({ label, value, icon: Icon, labelWidth = "70px" }: RiskBarProps) {
  const pct = Math.round(value * 100)
  const color = value > 0.7 ? 'var(--color-status-critical)' : value > 0.4 ? 'var(--color-observing)' : 'var(--color-status-stable)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
      <Icon size={10} color="var(--color-text-tertiary)" />
      <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', width: labelWidth, fontFamily: 'var(--font-mono)' }}>{label}</span>
      <div style={{
        flex: 1,
        height: '4px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: color,
            borderRadius: 'var(--radius-full)',
          }}
        />
      </div>
      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color, width: '28px', textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}
