import { motion } from 'framer-motion'
import { 
  MessageSquareWarning, FileText, AlertTriangle 
} from 'lucide-react'
import { supabase } from '@/supabaseClient'
import { 
  Complaint, MedicalReport, RiskPrediction, ClinicalOrderItem 
} from '@/types'
import { smallBtnStyle, tagStyle } from './CommandUIElements'

// --- COMPLAINTS ---
interface ComplaintsTabProps {
  items: Complaint[]
  onRefresh: () => void
  onSelect: (item: ClinicalOrderItem) => void
}

export function ComplaintsTab({ items, onRefresh, onSelect }: ComplaintsTabProps) {
  const resolveComplaint = async (id: string) => {
    await supabase.from('complaints').update({ 
      status: 'resolved', 
      resolved_at: new Date().toISOString(), 
      resolved_by: 'Duty Doctor' 
    }).eq('complaint_id', id)
    onRefresh()
  }

  const statusColor: Record<string, string> = { 
    open: 'var(--color-critical)', 
    in_progress: 'var(--color-observing)', 
    resolved: 'var(--color-stable)' 
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-zinc-500 font-mono tracking-[2px] mb-3 uppercase">
        PATIENT COMPLAINTS
      </div>
      {items.map(c => {
        const color = statusColor[c.status] || 'var(--text-dim)'
        return (
          <motion.div 
            key={c.id} 
            whileHover={{ scale: 1.01, backgroundColor: `${color}15` }}
            onClick={() => onSelect({ ...c, type: 'complaint' })}
            className="p-3 mb-1.5 rounded-lg border cursor-pointer transition-all"
            style={{ 
              borderColor: `${color}33`, 
              background: `${color}08` 
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquareWarning size={13} color={color} />
                <span className="text-[11px] font-bold" style={{ color }}>{c.status.toUpperCase()}</span>
                <span className="text-[10px] text-zinc-500 font-mono">{c.patients?.name || c.patient_id}</span>
              </div>
              {c.status !== 'resolved' && (
                <button onClick={(e) => { e.stopPropagation(); resolveComplaint(c.id); }} style={smallBtnStyle('var(--color-stable)')}>RESOLVE</button>
              )}
            </div>
            <div className="text-[12px] text-[var(--text-primary)] mt-1.5 pl-[21px] font-medium leading-relaxed">
              {c.nature}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// --- REPORTS ---
interface ReportsTabProps {
  items: MedicalReport[]
  onSelect: (item: ClinicalOrderItem) => void
}

export function ReportsTab({ items, onSelect }: ReportsTabProps) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] text-zinc-500 font-mono tracking-[2px] mb-3 uppercase">
        PATIENT MEDICAL REPORTS
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map(r => (
          <motion.div 
            key={r.report_id} 
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.03)' }}
            onClick={() => onSelect({ ...r, type: 'report' })}
            className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--glass-bg)] flex items-center gap-3 cursor-pointer transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-[var(--accent-blue)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate">{r.report_type}</div>
              <div className="text-[10px] text-zinc-500 font-mono truncate">{r.patients?.name || r.patient_id}</div>
              <div className="flex gap-2 mt-1.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); onSelect({ ...r, type: 'report' }); }} 
                  className="px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-[var(--accent-blue)] text-[9px] font-bold font-mono cursor-pointer"
                >
                  VIEW
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if ((window as any).onNavigateToSentinel) (window as any).onNavigateToSentinel();
                  }} 
                  className="px-2.5 py-1 rounded-md bg-[var(--color-stable)]/10 border border-[var(--color-stable)]/20 text-[var(--color-stable)] text-[9px] font-bold font-mono cursor-pointer"
                >
                  VERIFY
                </button>
              </div>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono shrink-0">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// --- PREDICTIONS (AI ANALYTICS) ---
interface PredictionsTabProps {
  items: RiskPrediction[]
  onSelect: (item: ClinicalOrderItem) => void
}

export function PredictionsTab({ items, onSelect }: PredictionsTabProps) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-zinc-500 font-mono tracking-[2px] mb-3 uppercase">
        CHRONOS AI RISK PREDICTION LOG
      </div>
      {items.map(p => {
        const risk = p.risk_percentage || p.risk_score || 0
        const color = risk >= 70 ? 'var(--color-critical)' : risk >= 40 ? 'var(--color-observing)' : 'var(--color-stable)'
        return (
          <motion.div 
            key={p.id} 
            whileHover={{ scale: 1.01, backgroundColor: `${color}10` }}
            onClick={() => onSelect({ ...p, type: 'prediction' })}
            className="p-3 mb-1.5 rounded-lg border cursor-pointer transition-all"
            style={{ 
              borderColor: `${color}33`, 
              background: `${color}06` 
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} color={color} />
                <span className="text-[13px] font-black font-mono" style={{ color }}>{risk}%</span>
                <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/5 tracking-wider" style={{ color }}>
                  {risk >= 70 ? 'WINDOW: 2H' : risk >= 40 ? 'WINDOW: 6H' : 'WINDOW: 12H'}
                </span>
                <span className="text-[11px] font-semibold">{p.patients?.name || p.patient_id}</span>
                {p.event && <span className={tagStyle}>{p.event}</span>}
              </div>
              <span className="text-[9px] text-zinc-500 font-mono">
                {new Date(p.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2 mt-2 pl-[21px]">
              {[p.shap_1, p.shap_2, p.shap_3].filter(Boolean).map((s, i) => (
                <span key={i} className={tagStyle}>
                  {s}
                </span>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
