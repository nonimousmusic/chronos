import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ClipboardList, CheckCircle2, Clock, Syringe, Send, X 
} from 'lucide-react'
import { supabase } from '@/supabaseClient'
import { 
  Instruction, AdministeredMedication, Patient, UserProfile, ClinicalOrderItem 
} from '@/types'
import { smallBtnStyle, tagStyle } from './CommandUIElements'

// --- INSTRUCTIONS ---
interface InstructionsTabProps {
  items: Instruction[]
  nurses: UserProfile[]
  onRefresh: () => void
  doctorId: string
  onSelect: (item: ClinicalOrderItem) => void
}

export function InstructionsTab({ items, nurses, onRefresh, doctorId: _doctorId, onSelect }: InstructionsTabProps) {
  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('instructions').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('instruction_id', id)
    onRefresh()
  }

  const statusColor: Record<string, string> = { 
    pending: 'var(--color-observing)', 
    in_progress: 'var(--accent-blue)', 
    completed: 'var(--color-stable)' 
  }
  
  const statusIcon: Record<string, any> = { 
    pending: Clock, 
    in_progress: ClipboardList, 
    completed: CheckCircle2 
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-zinc-500 font-mono tracking-[2px] mb-3 uppercase">
        DOCTOR → NURSE ORDERS
      </div>
      {items.map(inst => {
        const Icon = statusIcon[inst.status] || Clock
        const color = statusColor[inst.status] || 'var(--text-dim)'
        const nurse = nurses.find(n => n.id === inst.nurse_id)
        
        return (
          <motion.div 
            key={inst.id} 
            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }}
            onClick={() => onSelect({ 
              ...inst, 
              type: 'instruction'
            })}
            className="p-3 mb-1.5 rounded-lg border border-[var(--color-border-subtle)] relative cursor-pointer transition-all"
            style={{ 
              background: inst.status === 'completed' ? 'transparent' : 'var(--glass-bg)' 
            }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg" style={{ background: color }} />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icon size={13} color={color} />
                <span className="text-[11px] font-bold" style={{ color }}>{inst.status.toUpperCase()}</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {inst.patients?.name || inst.patient_id}
                </span>
                <span className={`text-[9px] font-mono ${inst.nurse_id ? 'text-zinc-500' : 'text-[var(--accent-purple)] font-bold'}`}>
                  → {nurse ? nurse.name : 'Patient Portal'}
                </span>
              </div>
              {inst.status !== 'completed' && (
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  {inst.status === 'pending' && (
                    <button onClick={() => updateStatus(inst.id, 'in_progress')} style={smallBtnStyle('var(--accent-blue)')}>
                      START
                    </button>
                  )}
                  <button onClick={() => updateStatus(inst.id, 'completed')} style={smallBtnStyle('var(--color-stable)')}>
                    DONE
                  </button>
                </div>
              )}
            </div>
            <div className="text-[12px] text-[var(--text-primary)] mt-1.5 pl-[21px] font-medium leading-relaxed">
              {inst.text}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// --- MEDICATIONS ---
interface MedicationsTabProps {
  items: AdministeredMedication[]
  onSelect: (item: ClinicalOrderItem) => void
}

export function MedicationsTab({ items, onSelect }: MedicationsTabProps) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] text-zinc-500 font-mono tracking-[2px] mb-3 uppercase">
        MEDICATION ADMINISTRATION LOG
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map(med => (
          <motion.div 
            key={med.id} 
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.03)' }}
            onClick={() => onSelect({ ...med, type: 'medication' })}
            className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--glass-bg)] cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Syringe size={13} className="text-[var(--accent-purple)]" />
              <span className="text-[13px] font-bold">{med.medicine}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-1.5">
              <span className={tagStyle}>{med.dosage}</span>
              <span className={tagStyle}>{med.route}</span>
              <span className={tagStyle}>{med.patients?.name || med.patient_id}</span>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">
              {new Date(med.administered_at).toLocaleString()}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// --- NEW ORDER MODAL ---
interface NewOrderModalProps {
  onClose: () => void
  onSubmit: () => void
  doctorId: string
  patients: Patient[]
  nurses: UserProfile[]
}

export function NewOrderModal({ onClose, onSubmit, doctorId, patients, nurses }: NewOrderModalProps) {
  const [type, setType] = useState<'instruction' | 'medication' | 'reminder'>('instruction')
  const [patientId, setPatientId] = useState(patients[0]?.id || '')
  const [nurseId, setNurseId] = useState(nurses[0]?.id || '')
  const [text, setText] = useState('')
  const [medicine, setMedicine] = useState('')
  const [dosage, setDosage] = useState('')
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDays, setReminderDays] = useState(30)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (type === 'instruction') {
        await supabase.from('instructions').insert({
          doctor_id: doctorId, patient_id: patientId, nurse_id: nurseId || null, text,
        })
      } else if (type === 'medication') {
        const { error } = await supabase.from('administered').insert({
          doctor_id: doctorId, 
          patient_id: patientId, 
          nurse_id: nurseId || null,
          medicine, 
          dosage, 
          route: 'IV',
          is_administered: false
        })
        if (error) throw error
      } else if (type === 'reminder') {
        const d = new Date()
        d.setDate(d.getDate() + Number(reminderDays))
        await supabase.from('patient_reminders').insert({
          patient_id: patientId, title: reminderTitle, reminder_date: d.toISOString()
        })
      }
      onSubmit()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = "w-full p-[10px_12px] rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] text-[13px] font-display outline-none disabled:opacity-50"

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        className="glass w-full max-w-[480px] p-6 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-[16px] font-bold">New Clinical Order</h2>
          <button onClick={onClose} className="bg-none border-none text-zinc-500 cursor-pointer"><X size={18} /></button>
        </div>

        {/* Type selector */}
        <div className="flex gap-2 mb-4">
          {(['instruction', 'medication', 'reminder'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 rounded-lg border transition-all text-[12px] font-semibold capitalize ${
              type === t ? 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]' : 'border-[var(--color-border-subtle)] text-zinc-500'
            }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Patient selector */}
        <label className="text-[10px] text-zinc-500 font-mono tracking-widest block mb-1 uppercase">PATIENT</label>
        <select value={patientId} onChange={e => setPatientId(e.target.value)} className={`${inputStyle} mb-3 cursor-pointer`}>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
        </select>

        {/* Nurse selector */}
        {type !== 'reminder' && (
          <>
            <label className="text-[10px] text-zinc-500 font-mono tracking-widest block mb-1 uppercase">ASSIGN TO</label>
            <select value={nurseId} onChange={e => setNurseId(e.target.value)} className={`${inputStyle} mb-3 cursor-pointer`}>
              <option value="">Patient (Direct Interface)</option>
              {nurses.map(n => <option key={n.id} value={n.id}>Nurse: {n.name}</option>)}
            </select>
          </>
        )}

        {type === 'instruction' && (
          <div className="mb-4">
            <label className="text-[10px] text-zinc-500 font-mono tracking-widest block mb-1 uppercase">INSTRUCTION</label>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Start 2L O2..." className={`${inputStyle} h-20 resize-none`} />
          </div>
        )}

        {type === 'medication' && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-[10px] text-zinc-500 font-mono tracking-widest block mb-1 uppercase">MEDICINE</label>
              <input value={medicine} onChange={e => setMedicine(e.target.value)} placeholder="Medicine name" className={inputStyle} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-mono tracking-widest block mb-1 uppercase">DOSAGE</label>
              <input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g. 500mg" className={inputStyle} />
            </div>
          </div>
        )}

        {type === 'reminder' && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-[10px] text-zinc-500 font-mono tracking-widest block mb-1 uppercase">REMINDER TITLE</label>
              <input value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} placeholder="e.g. Follow-up" className={inputStyle} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-mono tracking-widest block mb-1 uppercase">DAYS FROM NOW</label>
              <input type="number" value={reminderDays} onChange={e => setReminderDays(Number(e.target.value))} className={inputStyle} />
            </div>
          </div>
        )}

        <button 
          onClick={handleSubmit} 
          disabled={loading} 
          className="w-full p-3 rounded-lg bg-gradient-to-br from-[var(--color-brand-accent)] to-[var(--accent-blue)] border-none text-white font-bold text-[13px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-xl"
        >
          <Send size={14} /> {loading ? 'SUBMITTING...' : 'SUBMIT ORDER'}
        </button>
      </motion.div>
    </motion.div>
  )
}
