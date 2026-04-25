import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
import {
  ShieldCheck, FileText, Pill, AlertTriangle, Send, User, Activity, BellRing
} from 'lucide-react'
import { 
  Patient, OTBlock, AdministeredMedication, Instruction, Complaint 
} from '@/types'

interface PortalData {
  patient: Patient | null
  otBlock: OTBlock | null
  medications: AdministeredMedication[]
  instructions: Instruction[]
  reminders: any[]
  complaints: Complaint[]
}

export default function PatientPortal() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [data, setData] = useState<PortalData>({
    patient: null,
    otBlock: null,
    medications: [],
    instructions: [],
    reminders: [],
    complaints: []
  })

  // Complaint form state
  const [complaintText, setComplaintText] = useState('')
  const [complaintTarget, setComplaintTarget] = useState<'nurse' | 'authority'>('nurse')

  useEffect(() => {
    fetchPatientData()
    
    // Set up realtime subscriptions
    const sub = supabase.channel('patient_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_reminders' }, fetchPatientData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instructions' }, fetchPatientData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, fetchPatientData)
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [])

  const fetchPatientData = async () => {
    // For demo MVP, we extract the patient ID from the pre-filled name "R. Sharma (P-1042)"
    const userName = user?.user_metadata?.name || ''
    const match = userName.match(/P-\d{4}/)
    const patientId = match ? match[0] : 'P-1042' // Fallback to P-1042 if not found

    // Fetch Patient Details
    const { data: patientData } = await supabase.from('patients').select('*').eq('id', patientId).single()
    
    // Fetch OT Block (Secure Sentinel Hash)
    const { data: otBlock } = await supabase.from('ot_blocks')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Fetch Administered Medications
    const { data: meds } = await supabase.from('administered')
      .select('*, users!nurse_id(name)')
      .eq('patient_id', patientId)
      .eq('is_administered', true)
      .order('administered_at', { ascending: false })
    
    // Fetch Instructions
    const { data: insts } = await supabase.from('instructions')
      .select('*, users!doctor_id(name)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    
    // Fetch Reminders
    const { data: rems } = await supabase.from('patient_reminders')
      .select('*')
      .eq('patient_id', patientId)
      .order('reminder_date', { ascending: true })
    
    // Fetch Complaints
    const { data: comps } = await supabase.from('complaints')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    setData({
      patient: (patientData as Patient) || { id: patientId, name: userName } as Patient,
      otBlock: otBlock as OTBlock || null,
      medications: meds as unknown as AdministeredMedication[] || [],
      instructions: (insts as unknown as Instruction[])?.filter(i => !i.nurse_id) || [],
      reminders: rems || [],
      complaints: comps as unknown as Complaint[] || []
    })
  }

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!complaintText.trim() || !data.patient) return

    await supabase.from('complaints').insert({
      patient_id: data.patient.id,
      lodged_by: 'patient',
      nature: complaintTarget === 'authority' ? 'Authority Escalation: ' + complaintText : 'Nurse Request: ' + complaintText,
      status: 'active'
    })

    setComplaintText('')
    await fetchPatientData()
  }

  const TABS = [
    { id: 'overview', label: 'My Hub', icon: User },
    { id: 'sentinel', label: 'OT Secure Record', icon: ShieldCheck },
    { id: 'meds', label: 'Medication History', icon: Pill },
    { id: 'instructions', label: 'My Instructions', icon: FileText },
    { id: 'reminders', label: 'Follow-ups', icon: BellRing },
    { id: 'complaints', label: 'Help & Complaints', icon: AlertTriangle },
  ]

  if (!data.patient) return <div className="p-10 text-white font-mono tracking-widest text-sm">ENCRYPTING SECURE HANDSHAKE...</div>

  return (
    <div className="max-w-[1200px] mx-auto p-6 grid grid-cols-[240px_1fr] gap-6 h-full">
      {/* ── SIDEBAR NAV ── */}
      <div className="flex flex-col gap-2">
        <div className="glass p-5 mb-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-brand-accent)] mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-black shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            {data.patient.name?.charAt(0) || 'P'}
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">{data.patient.name}</h2>
          <p className="text-[11px] text-zinc-500 font-mono mt-1 tracking-widest uppercase">
             ID: {data.patient.id}
          </p>
        </div>

        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          let badge = 0
          if (tab.id === 'instructions') badge = data.instructions.filter(i => i.status === 'pending').length
          if (tab.id === 'reminders') badge = data.reminders.length

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border-none transition-all duration-200 text-left font-display text-[14px] font-semibold cursor-pointer ${
                isActive ? 'bg-[var(--color-brand-accent)] text-black' : 'bg-[var(--glass-bg)] text-zinc-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={18} />
                {tab.label}
              </div>
              {badge > 0 && (
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${isActive ? 'bg-black/20 text-black' : 'bg-red-500 text-white'}`}>
                    {badge}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* ── EXCLUSIVE PATIENT CONTENT AREA ── */}
      <div className="glass p-8 overflow-auto scrollbar-hide rounded-[24px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* OVERVIEW / QR */}
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-[var(--color-stable)]">Welcome to your Secure Hub</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="glass p-6 bg-[var(--color-stable-bg)] border border-[var(--color-stable)]/20 rounded-2xl">
                    <h3 className="text-[16px] text-[var(--text-primary)] mb-4 flex items-center gap-2 font-bold">
                      <Activity size={18} className="text-[var(--color-stable)]" /> Admission Details
                    </h3>
                    <div className="flex flex-col gap-3 text-sm text-zinc-400">
                      <div><strong className="text-[var(--text-primary)] font-semibold">Unit:</strong> {data.patient.unit_id || 'MICU'}</div>
                      <div><strong className="text-[var(--text-primary)] font-semibold">Admitted:</strong> {data.patient.admission_time ? new Date(data.patient.admission_time).toLocaleDateString() : 'N/A'}</div>
                      <div><strong className="text-[var(--text-primary)] font-semibold">Diagnosis:</strong> {data.patient.diagnosis || 'Post-Op Monitoring'}</div>
                      <div><strong className="text-[var(--text-primary)] font-semibold">Status:</strong> <span className="text-[var(--color-stable)] font-bold">{data.patient.status?.toUpperCase() || 'STABLE'}</span></div>
                    </div>
                  </div>

                  <div className="glass p-6 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.01]">
                    <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-semibold">Your Universal Medical ID</h3>
                    <div className="bg-white p-3 rounded-2xl shadow-xl shadow-emerald-500/5">
                      <QRCodeSVG value={data.patient.id} size={150} level="H" />
                    </div>
                    <p className="mt-4 text-[10px] text-zinc-500 text-center max-w-[80%] font-mono leading-relaxed">
                      Scan at any Synapse GTB terminal to transmit encrypted medical history.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECURE OT HASH */}
            {activeTab === 'sentinel' && (
              <div>
                <h2 className="text-2xl font-bold mb-4 text-[var(--accent-purple)] flex items-center gap-3">
                  <ShieldCheck size={28} /> Operation Theatre Record
                </h2>
                <p className="text-zinc-400 mb-8 leading-relaxed">
                  Your surgical metrics are recorded deterministically using the Sentinel Black Box. This hash is exclusively available to you and your primary surgeon, guaranteeing transparency and untampered evidence of the procedure.
                </p>

                {data.otBlock ? (
                  <div className="glass p-8 bg-purple-500/[0.03] border border-purple-500/20 rounded-3xl text-center">
                    <ShieldCheck size={48} className="text-[var(--accent-purple)] mx-auto mb-4" />
                    <h3 className="text-lg text-white font-bold mb-2">Procedure Cryptographically Secured</h3>
                    <p className="text-sm text-zinc-500 mb-6">
                      Timestamp: {new Date(data.otBlock.created_at).toLocaleString()}
                    </p>
                    
                    <div className="text-left bg-black/40 p-4 rounded-xl border border-white/10 shadow-inner">
                      <div className="text-[9px] text-zinc-500 font-mono tracking-widest mb-1 font-bold">SECURE SHA-256 HASH</div>
                      <div className="text-[13px] text-[var(--accent-cyan)] font-mono break-all leading-relaxed">
                        {data.otBlock.curr_hash}
                      </div>
                    </div>

                    <button className="mt-8 px-6 py-3 rounded-xl bg-[var(--accent-purple)] text-white border-none font-display font-bold text-sm cursor-pointer shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-95 transition-all">
                      Download Immutable PDF Report
                    </button>
                  </div>
                ) : (
                  <div className="glass p-16 text-center opacity-50">
                    <ShieldCheck size={48} className="text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg text-zinc-400 font-bold">No OT records found</h3>
                    <p className="text-sm text-zinc-600 mt-2 font-mono">
                      Secure hash blocks are generated post-conclusion.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* MEDICATIONS */}
            {activeTab === 'meds' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-[var(--accent-cyan)]">Administered Medications</h2>
                
                {data.medications.length === 0 ? (
                  <div className="glass p-12 text-center opacity-40">
                    <Pill size={32} className="mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No clinical medications administered yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.medications.map(med => (
                      <motion.div 
                        key={med.id} 
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(56, 189, 248, 0.05)' }}
                        onClick={() => setSelectedItem({ ...med, type: 'medication' })}
                        className="glass p-4 flex justify-between items-center cursor-pointer transition-all duration-200 border border-white/5 rounded-2xl"
                      >
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                            <Pill size={20} className="text-[var(--accent-cyan)]" />
                          </div>
                          <div>
                            <div className="text-[16px] font-bold text-white">{med.medicine}</div>
                            <div className="text-[13px] text-zinc-500 mt-0.5">
                              Dose: {med.dosage} | Route: {med.route}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-zinc-600 font-mono tracking-tight">
                            {new Date(med.administered_at).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[var(--color-stable)] font-bold mt-1 tracking-wider uppercase">
                            Admin: {med.users?.name || 'Duty Nurse'}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INSTRUCTIONS */}
            {activeTab === 'instructions' && (
              <div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--color-brand-accent)]">Physician Instructions</h2>
                <p className="text-zinc-500 text-sm mb-6 font-medium">Direct observations and lifestyle guidance from your medical team.</p>
                
                {data.instructions.length === 0 ? (
                  <div className="glass p-16 text-center opacity-40">
                    <FileText size={40} className="mx-auto mb-4" />
                    <p className="text-sm">No direct instructions at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.instructions.map(inst => (
                      <motion.div 
                        key={inst.id} 
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(52, 211, 153, 0.05)' }}
                        onClick={() => setSelectedItem({ ...inst, type: 'instruction' })}
                        className={`glass p-5 rounded-2xl transition-all border-l-4 ${
                          inst.status === 'pending' ? 'border-[var(--color-observing)]' : 'border-[var(--color-stable)]'
                        } cursor-pointer`}
                      >
                        <div className="flex justify-between mb-3 text-[11px] font-mono">
                          <div className="text-zinc-500">
                            {new Date(inst.created_at).toLocaleString()}
                          </div>
                          <div className={`px-2 py-0.5 rounded-md font-bold tracking-widest ${
                            inst.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                          }`}>
                            {inst.status.toUpperCase()}
                          </div>
                        </div>
                        <p className="text-[16px] text-white font-medium leading-relaxed">
                          {inst.text}
                        </p>
                        <div className="text-[11px] text-zinc-600 mt-4 uppercase tracking-[2px] font-bold">
                          Issued By: {inst.users?.name || 'Attending Surgeon'}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REMINDERS / FOLLOW-UPS */}
            {activeTab === 'reminders' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-[var(--accent-blue)]">Clinical Pathway Track</h2>
                
                {data.reminders.length === 0 ? (
                  <div className="glass p-16 text-center opacity-40 rounded-3xl">
                    <BellRing size={40} className="mx-auto mb-4" />
                    <p className="text-sm">No upcoming follow-ups scheduled.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.reminders.map(rem => {
                      const date = new Date(rem.reminder_date)
                      const diffTime = Math.abs(date.getTime() - new Date().getTime())
                      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                      const isUrgent = daysLeft <= 10
                      
                      return (
                        <motion.div 
                          key={rem.id} 
                          whileHover={{ scale: 1.02, backgroundColor: 'rgba(56, 189, 248, 0.05)' }}
                          onClick={() => setSelectedItem({ ...rem, type: 'reminder', daysLeft, isUrgent })}
                          className="glass p-6 flex flex-col justify-between border border-white/5 rounded-[24px] cursor-pointer"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="text-[17px] font-bold text-white tracking-tight">{rem.title}</h3>
                              <div className={`p-2 rounded-lg ${isUrgent ? 'bg-red-500/10 text-red-500' : 'bg-sky-500/10 text-sky-500'}`}>
                                <BellRing size={16} />
                              </div>
                            </div>
                            <div className="text-[13px] text-zinc-500 font-mono">
                              DATE: {date.toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-8">
                            <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center font-bold ${
                                isUrgent ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-sky-500/10 border-sky-500/30 text-sky-500'
                            }`}>
                              <span className="text-lg leading-none">{daysLeft}</span>
                              <span className="text-[8px] font-mono tracking-tighter">DAYS</span>
                            </div>
                            <div className={`text-xs font-bold tracking-widest uppercase ${isUrgent ? 'text-red-500' : 'text-zinc-500'}`}>
                              {isUrgent ? 'URGENT DISPATCH' : 'UPCOMING STATUS'}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* COMPLAINTS */}
            {activeTab === 'complaints' && (
              <div>
                <h2 className="text-2xl font-bold mb-4 text-[var(--color-critical)]">Secure Help & Request Desk</h2>
                <p className="text-zinc-400 mb-8 leading-relaxed">
                  Synapse GTB provides an encrypted emergency channel directly to nursing staff and health authorities. All logs are tamper-proof.
                </p>

                <form onSubmit={submitComplaint} className="glass p-6 mb-10 rounded-3xl border border-white/5 bg-white/[0.01]">
                  <div className="flex gap-6 mb-6">
                    <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-white">
                      <input 
                        type="radio" 
                        checked={complaintTarget === 'nurse'} 
                        onChange={() => setComplaintTarget('nurse')}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      Active Request (Nurse)
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-red-500">
                      <input 
                        type="radio" 
                        checked={complaintTarget === 'authority'} 
                        onChange={() => setComplaintTarget('authority')}
                        className="w-4 h-4 accent-red-500"
                      />
                      Authority Escalation
                    </label>
                  </div>
                  
                  <textarea
                    value={complaintText}
                    onChange={e => setComplaintText(e.target.value)}
                    placeholder={complaintTarget === 'nurse' ? "E.g., I'm experiencing discomfort near the IV site..." : "E.g., Formal grievance regarding facility safety..."}
                    className="w-full min-h-[140px] p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] text-base font-medium outline-none focus:border-[var(--color-brand-accent)] transition-all resize-none shadow-inner mb-6"
                    required
                  />
                  
                  <button type="submit" className={`w-full md:w-auto px-10 py-3.5 rounded-xl border-none text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2.5 shadow-xl transition-all hover:brightness-110 active:scale-95 ${
                    complaintTarget === 'authority' ? 'bg-red-600 shadow-red-600/20' : 'bg-[var(--color-stable)] text-black shadow-emerald-600/20'
                  }`}>
                    <Send size={18} /> SEND ENCRYPTED PACKET
                  </button>
                </form>

                <h3 className="text-lg font-bold text-white mb-4">Transmission History</h3>
                {data.complaints.length === 0 ? (
                  <p className="text-zinc-600 font-mono text-xs">NO PREVIOUS LOGS DETECTED.</p>
                ) : (
                  <div className="space-y-3">
                    {data.complaints.map(c => (
                      <div key={c.id} className={`glass p-4 rounded-xl border-l-[3px] shadow-sm ${
                        c.nature.includes('Authority') ? 'border-red-500 bg-red-500/[0.02]' : 'border-zinc-700'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] text-zinc-600 font-mono">{new Date(c.created_at).toLocaleString()}</span>
                          <span className="text-[9px] font-black uppercase bg-white/5 px-2 py-0.5 rounded-md tracking-widest text-zinc-400 border border-white/5">{c.status}</span>
                        </div>
                        <p className="text-[14px] text-zinc-300 font-medium">{c.nature}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {selectedItem && (
          <ItemDetailModal 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
          />
        )}
      </div>
    </div>
  )
}

// ─── ITEM DETAIL MODAL ──────────────────────────────────────────────
interface ItemDetailModalProps {
  item: any
  onClose: () => void
}

function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const typeLabels: Record<string, string> = {
    instruction: 'Doctor Instruction',
    medication: 'Clinical Administration',
    reminder: 'Pathway Reminder',
    complaint: 'Grievance / Request'
  }

  const icons: Record<string, any> = {
    instruction: FileText,
    medication: Pill,
    reminder: BellRing,
    complaint: AlertTriangle
  }

  const Icon = icons[item.type] || FileText

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9 }}
        className="glass w-full max-w-[480px] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/5 rounded-[32px]"
      >
        <div className="flex items-center gap-5 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand-accent)]/10 flex items-center justify-center border border-[var(--color-brand-accent)]/20 shadow-inner">
            <Icon size={24} className="text-[var(--color-brand-accent)]" />
          </div>
          <div>
            <div className="text-[10px] text-[var(--color-brand-accent)] font-mono tracking-[4px] font-black uppercase">
              {typeLabels[item.type]}
            </div>
            <h2 className="text-2xl font-black text-white mt-1 leading-none tracking-tight">
              {item.medicine || item.title || item.nature?.substring(0, 24) || item.text?.substring(0, 24) || 'SECURE DATA'}
            </h2>
          </div>
        </div>

        <div className="space-y-6">
          {item.type === 'instruction' && (
            <div className="space-y-5">
               <DetailSection label="Patient Note" value={item.text} large />
               <div className="grid grid-cols-2 gap-4">
                  <DetailSection label="Doctor" fallback="Attending Physician" />
                  <DetailSection label="Status" value={item.status?.toUpperCase()} color={item.status === 'completed' ? 'var(--color-stable)' : 'var(--color-observing)'} />
                  <DetailSection label="Timestamp" value={new Date(item.created_at).toLocaleString()} />
               </div>
            </div>
          )}

          {item.type === 'medication' && (
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <DetailSection label="Medicine" value={item.medicine} />
                <DetailSection label="Dosage" value={item.dosage} />
                <DetailSection label="Route" value={item.route} />
                <DetailSection label="Administered By" fallback="Handled by Nurse" />
                <DetailSection label="Timestamp" value={new Date(item.administered_at).toLocaleString()} />
            </div>
          )}

          {item.type === 'reminder' && (
            <div className="space-y-5">
               <DetailSection label="Follow-up Pathway" value={item.title} large />
               <div className="grid grid-cols-2 gap-4">
                  <DetailSection label="Scheduled Date" value={new Date(item.reminder_date).toLocaleDateString()} />
                  <DetailSection label="Urgency" value={item.isUrgent ? 'CRITICAL' : 'ROUTINE'} color={item.isUrgent ? 'var(--color-critical)' : 'var(--color-stable)'} />
                  <DetailSection label="Time To Event" value={`${item.daysLeft} Days`} />
               </div>
               <div className="text-[12px] text-zinc-500 bg-white/[0.02] p-4 rounded-xl border border-white/5 italic leading-relaxed">
                  Deterministic reminder system. Please ensure all digital signatures are ready for the upcoming clinic visit.
               </div>
            </div>
          )}

          <button 
            onClick={onClose}
            className="w-full py-4 rounded-xl bg-[var(--color-brand-accent)] text-black font-black text-sm border-none shadow-lg shadow-emerald-500/10 hover:brightness-110 active:scale-95 transition-all mt-4 tracking-widest uppercase"
          >
            ACKNOWLEDGE & DISMISS
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface DetailSectionProps {
  label: string
  value?: string
  color?: string
  large?: boolean
  fallback?: string
}

function DetailSection({ label, value, color, large, fallback }: DetailSectionProps) {
  const displayValue = value || fallback || '—'
  return (
    <div>
      <div className="text-[10px] text-zinc-600 font-mono tracking-widest mb-1.5 uppercase font-bold">
        {label}
      </div>
      <div className={`font-display leading-tight ${large ? 'text-[17px] font-bold' : 'text-sm font-semibold'} transition-colors`} style={{ color: color || 'var(--text-primary)' }}>
        {displayValue}
      </div>
    </div>
  )
}
