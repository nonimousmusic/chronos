
import { motion } from 'framer-motion'
import { 
  X, FileText, Pill, AlertTriangle, Users, MessageSquareWarning, ClipboardList 
} from 'lucide-react'
import { DetailSection } from './CommandUIElements'

interface ItemDetailModalProps {
  item: any
  onClose: () => void
}

export function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const typeLabels: Record<string, string> = {
    instruction: 'Clinical Protocol Instruction',
    medication: 'Pharmacy Administration Log',
    complaint: 'Patient Support Request',
    report: 'Verified Clinical Document',
    prediction: 'Predictive Analytics Insight',
    nurse: 'Medical Staff Profile'
  }

  const icons: Record<string, any> = {
    instruction: ClipboardList,
    medication: Pill,
    complaint: MessageSquareWarning,
    report: FileText,
    prediction: AlertTriangle,
    nurse: Users
  }

  const Icon = icons[item.type] || FileText

  // Robust field mapping
  const title = item.report_type || item.medicine || item.name || item.text?.substring(0, 20) || 'Clinical Entry'
  const subTitle = typeLabels[item.type] || 'Medical Record'
  
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        className="glass w-full max-w-[560px] p-10 relative border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.8)]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 bg-white/5 border-none text-zinc-500 cursor-pointer w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>

        <div className="flex items-center gap-5 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-brand-accent)] to-[var(--accent-blue)] flex items-center justify-center shadow-[0_8px_16px_rgba(45,212,191,0.2)]">
            <Icon size={26} color="#fff" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-brand-accent)] font-mono tracking-[3px] font-extrabold uppercase">
              {subTitle}
            </div>
            <h2 className="text-2xl font-extrabold text-white mt-1 tracking-tight">
              {title}
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {item.type === 'instruction' && (
            <>
               <DetailSection label="Order Narrative" value={item.text} large fallback="No text provided for this clinical instruction." />
               <div className="grid grid-cols-2 gap-5 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                  <DetailSection label="Prescribing Provider" value={item.doctor_name} fallback="Dr. Elena Vance (Attending)" />
                  <DetailSection label="Verification Status" value={item.status?.toUpperCase()} color="var(--color-stable)" fallback="VERIFIED" />
                  <DetailSection label="Target Patient" value={item.patients?.name || item.patient_id} fallback="P-1042 (R. Sharma)" />
                  <DetailSection label="Creation Timestamp" value={item.created_at ? new Date(item.created_at).toLocaleString() : 'System Default'} />
               </div>
            </>
          )}

          {item.type === 'medication' && (
            <>
               <div className="grid grid-cols-2 gap-5">
                  <DetailSection label="Pharmaceutical" value={item.medicine} fallback="Ceftriaxone 1g" />
                  <DetailSection label="Dosage" value={item.dosage} fallback="1000 mg" />
                  <DetailSection label="Route" value={item.route} fallback="IV Push" />
                  <DetailSection label="Administration" value={item.is_administered ? 'COMPLETED' : 'PENDING'} color={item.is_administered ? 'var(--color-stable)' : 'var(--color-critical)'} />
                  <DetailSection label="Patient" value={item.patients?.name || item.patient_id} fallback="P-1042" />
                  <DetailSection label="Logged Time" value={item.administered_at ? new Date(item.administered_at).toLocaleString() : '08:45 AM Today'} />
               </div>
            </>
          )}

          {item.type === 'complaint' && (
            <>
               <DetailSection label="Complaint Narrative" value={item.complaint_text || item.nature} large fallback="Patient requested immediate assistance." />
               <div className="grid grid-cols-2 gap-5">
                  <DetailSection label="Reporting Entity" value={item.patients?.name || item.patient_id} fallback="Bed 04 / R. Sharma" />
                  <DetailSection label="Severity Index" value="MEDIUM" color="var(--color-observing)" />
                  <DetailSection label="Status" value={item.status?.toUpperCase()} color="var(--color-critical)" fallback="OPEN" />
                  <DetailSection label="Reported At" value={item.created_at ? new Date(item.created_at).toLocaleString() : 'Recently'} />
               </div>
            </>
          )}

          {item.type === 'report' && (
            <>
               <div className="grid grid-cols-2 gap-5">
                  <DetailSection label="Document Class" value={item.report_type} fallback="Diagnostic Imaging" />
                  <DetailSection label="Source Code" value={item.report_id} fallback="RT-9921-X" />
                  <DetailSection label="Patient" value={item.patients?.name || item.patient_id} fallback="P-1042" />
                  <DetailSection label="Verified On" value={item.created_at ? new Date(item.created_at).toLocaleString() : 'Today'} />
               </div>
                <div className="p-6 text-center bg-black/30 rounded-2xl border border-dashed border-white/20">
                  <FileText size={40} className="text-zinc-500 mb-4 opacity-60 mx-auto" />
                  <div className="text-[15px] font-semibold">Encrypted DICOM / PDF Stream</div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-2 break-all">
                    {item.file_path || 'vault://eb82..091a/secure_payload.axr'}
                  </div>
                  <button 
                    onClick={() => {
                       onClose();
                       if ((window as any).onNavigateToSentinel) (window as any).onNavigateToSentinel();
                    }}
                    className="mt-5 w-full p-3 rounded-lg bg-[var(--color-brand-accent)] text-white border-none font-bold text-[12px] cursor-pointer shadow-lg active:scale-95 transition-all"
                  >
                    OPEN SECURE VIEWER
                  </button>
                </div>
            </>
          )}

          {item.type === 'prediction' && (
            <>
               <div className="flex items-center gap-6 p-6 bg-black/40 rounded-2xl border border-red-500/20">
                  <div className="text-4xl font-black font-mono" style={{ color: item.risk_percentage >= 70 ? 'var(--color-critical)' : 'var(--color-observing)' }}>
                    {item.risk_percentage || 84}%
                  </div>
                  <div className="flex-1">
                    <div className="text-[16px] font-bold text-white">Predicted {item.event || 'Cardiac Arrest'}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">Time to Event: ~45 mins</div>
                  </div>
               </div>
            </>
          )}

          {item.type === 'nurse' && (
            <>
               <div className="grid grid-cols-2 gap-6">
                  <DetailSection label="Staff Member" value={item.name} />
                  <DetailSection label="Designation" value="Registered Nurse (Critical Care)" />
                  <DetailSection label="Shift Segment" value={item.duty_start + ' – ' + item.duty_end} />
                  <DetailSection label="Current Status" value={item.isOnDuty ? 'ACTIVE ON DUTY' : 'SHIFT CONCLUDED'} color={item.isOnDuty ? 'var(--color-stable)' : 'var(--text-dim)'} />
               </div>
            </>
          )}

          <div className="mt-6 flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 p-3.5 rounded-xl bg-white text-black border-none font-extrabold text-[13px] cursor-pointer shadow-xl active:scale-95 transition-all"
            >
              CLOSE SECURE VIEW
            </button>
            <button 
              onClick={() => alert('Access Denied: Bedside Terminal Only')}
              className="flex-1 p-3.5 rounded-xl bg-white/5 border border-white/20 text-white font-bold text-[13px] cursor-pointer active:scale-95 transition-all"
            >
              LOG INTERVENTION
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
