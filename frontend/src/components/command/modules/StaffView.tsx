import { motion } from 'framer-motion'
import { 
  Building2 
} from 'lucide-react'
import { 
  UserProfile, Patient, MedicalUnit, ClinicalOrderItem 
} from '@/types'
import { isWithinShift } from './CommandUIElements'

interface StaffTabProps {
  nurses: UserProfile[]
  units: MedicalUnit[]
  patients: Patient[]
  onSelect: (item: ClinicalOrderItem) => void
}

export function StaffTab({ nurses, units, patients, onSelect }: StaffTabProps) {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  return (
    <div className="space-y-4">
      <div className="text-[10px] text-zinc-500 font-mono tracking-[2px] mb-3 uppercase">
        NURSING STAFF & UNITS
      </div>

      {/* Units overview */}
      <div className="flex flex-wrap gap-2 mb-4">
        {units.map(u => {
          const pCount = patients.filter(p => p.unit_id === u.unit_id).length
          return (
            <div key={u.unit_id} className="px-3.5 py-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--glass-bg)] flex items-center gap-2">
              <Building2 size={14} className="text-[var(--accent-blue)]" />
              <div>
                <div className="text-[11px] font-semibold">{u.unit_type}</div>
                <div className="text-[9px] text-zinc-500 font-mono">{pCount} patients</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Nurses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {nurses.map(n => {
          const isOnDuty = isWithinShift(n.duty_start || '00:00', n.duty_end || '23:59', currentTime)
          return (
            <motion.div 
              key={n.id} 
              whileHover={{ scale: 1.02 }}
              onClick={() => onSelect({ 
                id: n.id,
                name: n.name,
                duty_start: n.duty_start || '00:00',
                duty_end: n.duty_end || '23:59',
                role: 'nurse',
                type: 'nurse',
                isOnDuty
              })}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                isOnDuty ? 'bg-[var(--color-stable-bg)] border-[rgba(52,211,153,0.3)]' : 'bg-[var(--glass-bg)] border-[var(--color-border-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${
                  isOnDuty ? 'bg-[var(--color-stable)] animate-pulse' : 'bg-zinc-500'
                }`} />
                <span className="text-[13px] font-semibold">{n.name}</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Shift: {n.duty_start} – {n.duty_end}
              </div>
              <div className={`text-[9px] font-bold font-mono mt-1 tracking-wider uppercase ${
                isOnDuty ? 'text-[var(--color-stable)]' : 'text-zinc-500'
              }`}>
                {isOnDuty ? '● ON DUTY' : '○ OFF DUTY'}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
