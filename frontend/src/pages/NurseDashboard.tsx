import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import {
  ClipboardList, Pill, AlertTriangle, CheckCircle2, 
  Check, X, FileText, Clock, User, ExternalLink, MessageSquare,
  Loader2
} from 'lucide-react'
import { playNavClick, playSuccess, playNotification } from '@/utils/sounds'
import { 
  Instruction, AdministeredMedication, Complaint 
} from '@/types'

interface DashboardData {
  instructions: Instruction[]
  medications: AdministeredMedication[]
  complaints: Complaint[]
  history: any[]
}

export default function NurseDashboard() {
  const { user, doctor } = useAuth()
  const [activeTab, setActiveTab] = useState('tasks')
  const [data, setData] = useState<DashboardData>({
    instructions: [],
    medications: [],
    complaints: [],
    history: []
  })
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [modalType, setModalType] = useState<'task' | 'med' | 'complaint' | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    fetchActiveData()
    if (!user) return
    
    // Real-time subscriptions
    const sub = supabase.channel('nurse_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'instructions', 
        filter: `nurse_id=eq.${user.id}` 
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') playNotification()
        fetchActiveData()
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'administered', 
        filter: `nurse_id=eq.${user.id}` 
      }, fetchActiveData)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'complaints', 
        filter: `nurse_id=eq.${user.id}` 
      }, fetchActiveData)
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [user?.id])

  const fetchActiveData = async () => {
    if (!user) return
    const userId = user.id
    
    // 1. Pending Instructions (Assigned to this nurse)
    const { data: insts } = await supabase
      .from('instructions')
      .select('*, doctor:users!doctor_id(name), patient:patients(name)')
      .eq('nurse_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      
    // 2. Pending Medications (Assigned to this nurse)
    const { data: meds } = await supabase
      .from('administered')
      .select('*, doctor:users!doctor_id(name), patient:patients(name)')
      .eq('is_administered', false)
      .eq('nurse_id', userId)
      .order('admin_id', { ascending: false })
      
    // 3. Active Complaints (Assigned to this nurse)
    const { data: comps } = await supabase
      .from('complaints')
      .select('*, patient:patients(name)')
      .eq('nurse_id', userId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    // 4. Completed History
    const { data: instHistory } = await supabase.from('instructions')
      .select('*, patient:patients(name)')
      .eq('nurse_id', userId)
      .eq('status', 'completed')
      .limit(5)
    const { data: medHistory } = await supabase.from('administered')
      .select('*, patient:patients(name)')
      .eq('nurse_id', userId)
      .eq('is_administered', true)
      .limit(5)
    
    setData({
      instructions: insts as unknown as Instruction[] || [],
      medications: meds as unknown as AdministeredMedication[] || [],
      complaints: comps as unknown as Complaint[] || [],
      history: [...(instHistory || []).map(i => ({ ...i, type: 'instruction' })), ...(medHistory || []).map(m => ({ ...m, type: 'medication' }))]
        .sort((a, b) => new Date(b.completed_at || b.administered_at).getTime() - new Date(a.completed_at || a.administered_at).getTime())
    })
    setLoading(false)
  }

  const handleAction = async () => {
    if (!selectedTask || !user) return
    
    try {
      if (modalType === 'task') {
        const { error } = await supabase.from('instructions')
          .update({ 
            status: 'completed', 
            notes: note, 
            completed_at: new Date().toISOString() 
          })
          .eq('instruction_id', (selectedTask as any).instruction_id)
        if (error) throw error
      } else if (modalType === 'med') {
        const { error } = await supabase.from('administered')
          .update({ 
            is_administered: true, 
            notes: note, 
            administered_at: new Date().toISOString() 
          })
          .eq('admin_id', (selectedTask as any).admin_id)
        if (error) throw error
      } else if (modalType === 'complaint') {
        const { error } = await supabase.from('complaints')
          .update({ 
            status: 'resolved', 
            resolution_notes: note, 
            resolved_at: new Date().toISOString(),
            resolved_by: user.id
          })
          .eq('complaint_id', (selectedTask as any).complaint_id)
        if (error) throw error
      }
      
      playSuccess()
      setSelectedTask(null)
      setNote('')
      fetchActiveData()
    } catch (err) {
      console.error('Error completing task:', err)
    }
  }

  const TABS = [
    { id: 'tasks', label: 'Procedures', icon: ClipboardList, count: data.instructions.length },
    { id: 'meds', label: 'Medications', icon: Pill, count: data.medications.length },
    { id: 'complaints', label: 'Requests', icon: AlertTriangle, count: data.complaints.length },
    { id: 'history', label: 'History', icon: Clock, count: 0 },
  ]

  return (
    <div className="p-6 max-w-[1200px] mx-auto flex flex-col gap-6 h-full">
      {/* Nurse Profile & Assignment Header */}
      <div className="glass p-6 flex items-center justify-between border-l-4 border-[var(--color-brand-accent)]">
        <div className="flex gap-6 items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-brand-accent)] to-[var(--accent-blue)] flex items-center justify-center text-2xl text-white font-bold">
             {doctor?.name?.charAt(0) || 'N'}
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text-primary)]">{doctor?.name || 'Staff Nurse'}</h1>
            <div className="flex gap-4 mt-1.5">
              <span className="text-[13px] px-2.5 py-1 rounded-md bg-sky-500/10 text-[var(--accent-blue)] font-semibold uppercase tracking-wider">
                {doctor?.role || 'NURSE'}
              </span>
              <span className="text-[13px] text-zinc-500 flex items-center gap-1.5">
                <Clock size={14} /> Active Session: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-8 pl-8 border-l border-[var(--input-border)]">
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">Assigned Surgeon</div>
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">{doctor?.assigned_doctor_name || 'Dr. Sterling (Default)'}</div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">Assignment Sector</div>
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">{doctor?.assigned_icu_ward || 'ICU-A Critical Care'}</div>
          </div>
        </div>
      </div>

      {/* Header Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { playNavClick(); setActiveTab(tab.id); }}
            className={`glass p-5 flex flex-col gap-2 border-none cursor-pointer transition-all duration-300 text-left ${
              activeTab === tab.id ? 'bg-[var(--color-brand-accent)] text-white' : 'bg-[var(--glass-bg)] hover:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center justify-between">
              <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : 'text-zinc-500'} />
              {tab.count > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{tab.count}</span>}
            </div>
            <span className={`text-[13px] font-semibold ${activeTab === tab.id ? 'text-white' : 'text-[var(--text-primary)]'}`}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Work Area */}
      <div className="glass flex-1 p-8 overflow-auto scrollbar-hide rounded-[24px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-zinc-500 text-[14px] mb-8">
              Assign, supervise, and perform clinical protocols with deterministic records.
            </p>

            {loading ? (
              <div className="flex justify-center p-16">
                <Loader2 size={32} className="animate-spin text-[var(--color-brand-accent)]" />
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === 'tasks' && data.instructions.map(item => (
                  <TaskCard key={(item as any).instruction_id} item={item} onAction={() => { setSelectedTask(item); setModalType('task'); }} />
                ))}
                
                {activeTab === 'meds' && data.medications.map(item => (
                  <MedCard key={(item as any).admin_id} item={item} onAction={() => { setSelectedTask(item); setModalType('med'); }} />
                ))}

                {activeTab === 'complaints' && data.complaints.map(item => (
                   <ComplaintCard key={(item as any).complaint_id} item={item} onAction={() => { setSelectedTask(item); setModalType('complaint'); }} />
                ))}

                {activeTab === 'history' && data.history.map((item, idx) => (
                   <HistoryCard key={idx} item={item} />
                ))}

                {(data as any)[activeTab]?.length === 0 && activeTab !== 'history' && (
                  <div className="glass p-16 text-center opacity-60">
                    <CheckCircle2 size={48} className="mx-auto mb-4 text-[var(--color-stable)]" />
                    <h3 className="text-lg font-bold">All activities resolved</h3>
                    <p className="text-[13px] mt-2">There are no pending protocols in this sector.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="glass w-full max-w-[480px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Complete Procedure</h3>
                <button onClick={() => setSelectedTask(null)} className="bg-transparent border-none text-zinc-500 cursor-pointer hover:text-white transition-colors"><X size={22} /></button>
              </div>

              <div className="mb-6 p-4 bg-white/5 rounded-xl border-l-4 border-[var(--color-brand-accent)]">
                <div className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">Procedure Details</div>
                <div className="text-[15px] font-semibold leading-relaxed">{selectedTask.text || selectedTask.medicine || selectedTask.nature || 'No detailed info'}</div>
              </div>

              <label className="text-[12px] text-zinc-400 font-bold block mb-2">Clinical Notes (optional)</label>
              <textarea 
                value={note} onChange={e => setNote(e.target.value)} 
                placeholder="E.g. Patient tolerated well, BP 120/80..."
                className="w-full h-32 p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] mb-6 outline-none focus:border-[var(--color-brand-accent)] transition-all resize-none"
              />

              <button 
                onClick={handleAction} 
                className="w-full py-4 rounded-xl bg-[var(--color-brand-accent)] text-white font-bold text-base flex items-center justify-center gap-2.5 cursor-pointer shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                <Check size={20} /> Confirm Handover & Log
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TaskCard({ item, onAction }: { item: any, onAction: () => void }) {
  return (
    <div className="glass p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all">
      <div className="flex gap-5 items-center">
        <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <FileText size={20} className="text-[var(--accent-blue)]" />
        </div>
        <div>
          <div className="text-[16px] font-bold text-[var(--text-primary)]">{item.text}</div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-[12px] text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5"><User size={13} /> {item.patient?.name}</span>
            <span className="flex items-center gap-1.5"><Clock size={13} /> {new Date(item.created_at).toLocaleTimeString()}</span>
            <span className="text-[var(--accent-blue)]">By {item.doctor?.name || 'Staff Surgeon'}</span>
          </div>
        </div>
      </div>
      <button onClick={onAction} className="bg-[var(--color-brand-accent)] text-white px-5 py-2.5 rounded-lg font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all shadow-md">Mark Completed</button>
    </div>
  )
}

function MedCard({ item, onAction }: { item: any, onAction: () => void }) {
  return (
    <div className="glass p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all">
      <div className="flex gap-5 items-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Pill size={20} className="text-red-500" />
        </div>
        <div>
          <div className="text-[16px] font-bold text-[var(--text-primary)]">{item.medicine} <span className="text-zinc-500 font-normal">({item.dosage})</span></div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-[12px] text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5"><User size={13} /> {item.patient?.name}</span>
            <span className="flex items-center gap-1.5"><ExternalLink size={13} /> {item.route}</span>
            <span className="text-red-500">By {item.doctor?.name || 'Attending Physician'}</span>
          </div>
        </div>
      </div>
      <button onClick={onAction} className="bg-[var(--color-stable)] text-black px-5 py-2.5 rounded-lg font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all shadow-md">Administer</button>
    </div>
  )
}

function ComplaintCard({ item, onAction }: { item: any, onAction: () => void }) {
  return (
    <div className="glass p-6 border-l-4 border-red-500 flex items-center justify-between hover:bg-white/[0.02] transition-all">
       <div className="flex gap-5 items-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
          <MessageSquare size={20} className="text-red-500" />
        </div>
        <div>
          <div className="text-[16px] font-bold text-[var(--text-primary)]">{item.nature}</div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-[12px] text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5"><User size={13} /> {item.patient?.name}</span>
            <span className="flex items-center gap-1.5"><Clock size={13} /> {new Date(item.created_at).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
      <button onClick={onAction} className="bg-red-500 text-white px-5 py-2.5 rounded-lg font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all shadow-md">Resolve Request</button>
    </div>
  )
}

function HistoryCard({ item }: { item: any }) {
  return (
    <div className="glass p-4 sm:p-6 opacity-80 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-[var(--color-stable-bg)] flex items-center justify-center shrink-0">
          <Check size={16} className="text-[var(--color-stable)]" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-[var(--text-primary)]">{item.text || item.medicine || item.nature}</div>
          <div className="text-[12px] text-zinc-500 font-medium">Patient: {item.patient?.name} • {new Date(item.completed_at || item.administered_at).toLocaleString()}</div>
        </div>
      </div>
      {item.notes && <div className="text-[11px] text-[var(--color-brand-accent)] font-mono italic px-3 py-1 bg-[var(--color-brand-accent)]/5 rounded-md">"{item.notes}"</div>}
    </div>
  )
}
