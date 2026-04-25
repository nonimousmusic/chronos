import { motion } from 'framer-motion'
import { Radio, X, Zap } from 'lucide-react'
import { Patient } from '@/types'


// --- START OPERATION MODAL ---
interface StartOperationModalProps {
  onClose: () => void
  onConfirm: () => void
  patients: Patient[]
  selectedId: string
  setSelectedId: (id: string) => void
  loading: boolean
}

export const StartOperationModal = ({ onClose, onConfirm, patients, selectedId, setSelectedId, loading }: StartOperationModalProps) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-md flex items-center justify-center p-6"
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
      className="glass w-full max-w-[400px] p-8 border border-white/10 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[18px] font-black tracking-tight flex items-center gap-2">
          <Zap size={18} className="text-emerald-400" />
          Initialize Sentinel
        </h2>
        <button onClick={onClose} className="bg-white/5 border-none text-zinc-500 hover:text-white cursor-pointer w-7 h-7 rounded-lg flex items-center justify-center transition-all">
          <X size={16} />
        </button>
      </div>

      <p className="text-[13px] text-zinc-400 leading-relaxed mb-6">
        Please select the subject for this surgical session. Sentinel will generate a <span className="text-white font-bold">SHA-256 chain</span> securely anchoring all telemetry to the patient identity.
      </p>

      <label className="text-[10px] text-zinc-500 font-mono tracking-[2px] font-bold block mb-2 uppercase">PATIENT_IDENTITY</label>
      <select 
        value={selectedId} 
        onChange={e => setSelectedId(e.target.value)} 
        className="w-full p-3 rounded-xl border border-white/10 bg-black/40 text-white text-[13px] font-display outline-none cursor-pointer mb-8 focus:border-emerald-500/50 transition-all"
      >
        {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
      </select>

      <button 
        onClick={onConfirm}
        disabled={loading}
        className="w-full p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none font-black text-[13px] tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all uppercase"
      >
        <Radio size={16} className="animate-pulse" /> {loading ? 'Initializing...' : 'Start Flight Recorder'}
      </button>
    </motion.div>
  </motion.div>
)
