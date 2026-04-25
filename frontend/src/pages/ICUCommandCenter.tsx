import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, MessageSquareWarning, ClipboardList, Users, 
  AlertTriangle, Pill, Plus, Upload, ShieldCheck, LucideIcon 
} from 'lucide-react'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { 
  PatientScannerModal 
} from '@/components/command/modules/PatientScanner'
import { 
  InstructionsTab, MedicationsTab, NewOrderModal 
} from '@/components/command/modules/OrderManagement'
import { 
  ComplaintsTab, ReportsTab, PredictionsTab 
} from '@/components/command/modules/RiskAnalysis'
import { 
  StaffTab 
} from '@/components/command/modules/StaffView'
import { 
  ItemDetailModal 
} from '@/components/command/modules/ItemDetailModal'
import { 
  Patient, UserProfile, Instruction, AdministeredMedication, Complaint, RiskPrediction 
} from '@/types'

interface TabConfig {
  key: string
  label: string
  icon: LucideIcon
  count: number
}

interface ICUCommandCenterProps {
  onNavigate: (view: string) => void
}

export default function ICUCommandCenter({ onNavigate }: ICUCommandCenterProps) {
  const { doctor } = useAuth()
  const [activeTab, setActiveTab] = useState('instructions')
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [administered, setAdministered] = useState<AdministeredMedication[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [reports, setReports] = useState<any[]>([]) // Add proper generic medical report type if needed
  const [patients, setPatients] = useState<Patient[]>([])
  const [nurses, setNurses] = useState<UserProfile[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [predictions, setPredictions] = useState<RiskPrediction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  // Load all data on mount
  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [inst, adm, comp, rep, pat, nur, uni, pred] = await Promise.all([
      supabase.from('instructions').select('*, patients(name)').order('created_at', { ascending: false }),
      supabase.from('administered').select('*, patients(name)').order('administered_at', { ascending: false }),
      supabase.from('complaints').select('*, patients(name)').order('created_at', { ascending: false }),
      supabase.from('reports').select('*, patients(name)').order('created_at', { ascending: false }),
      supabase.from('patients').select('*, units(unit_type)').order('id'),
      supabase.from('users').select('*').eq('role', 'nurse'),
      supabase.from('units').select('*'),
      supabase.from('risk_predictions').select('*, patients(name)').order('created_at', { ascending: false }),
    ])
    
    if (inst.data) setInstructions(inst.data)
    if (adm.data) setAdministered(adm.data)
    if (comp.data) setComplaints(comp.data)
    if (rep.data) setReports(rep.data)
    if (pat.data) setPatients(pat.data)
    if (nur.data) setNurses(nur.data)
    if (uni.data) setUnits(uni.data)
    if (pred.data) setPredictions(pred.data)
  }

  const TABS: TabConfig[] = [
    { key: 'instructions', label: 'Instructions', icon: ClipboardList, count: instructions.filter(i => i.status !== 'completed').length },
    { key: 'medications', label: 'Medications', icon: Pill, count: administered.length },
    { key: 'complaints', label: 'Complaints', icon: MessageSquareWarning, count: complaints.filter(c => c.status === 'active').length },
    { key: 'reports', label: 'Reports', icon: FileText, count: reports.length },
    { key: 'predictions', label: 'Risk Log', icon: AlertTriangle, count: predictions.length },
    { key: 'staff', label: 'Staff', icon: Users, count: nurses.length },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 bg-[var(--bg-abyss)]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <header className="text-[10px] text-zinc-500 font-mono tracking-[3px] font-bold uppercase mb-1">
            ICU COMMAND CENTER // OPS_DELTA
          </header>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-3">
            Operations Dashboard
            <span className="text-xs font-normal text-zinc-500 font-mono border-l border-white/10 pl-3">
              LIVE: {patients.length} PATIENTS • {nurses.filter(n => n.id).length} STAFF ONLINE
            </span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => onNavigate('sentinel')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] font-bold font-mono tracking-wider hover:bg-red-500/20 active:scale-95 transition-all"
          >
            <ShieldCheck size={14} /> SENTINEL
          </button>

          <button
            onClick={() => setShowScanner(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-bg)] border border-[var(--color-brand-accent)] text-[var(--color-brand-accent)] text-[11px] font-bold font-mono tracking-wider hover:bg-[var(--color-brand-accent)]/10 active:scale-95 transition-all"
          >
            <Upload size={14} /> SCAN PATIENT
          </button>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gradient-to-br from-[var(--color-brand-accent)] to-[var(--accent-blue)] text-white text-[11px] font-bold font-mono tracking-wider shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
          >
            <Plus size={14} /> NEW ORDER
          </button>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <nav className="flex gap-1 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-[12px] font-bold font-display transition-all border ${
                isActive 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-[var(--color-brand-accent)] ring-1 ring-emerald-500/20' 
                  : 'bg-[var(--glass-bg)] border-[var(--color-border-subtle)] text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black font-mono leading-none ${
                  isActive ? 'bg-[var(--color-brand-accent)] text-black' : 'bg-white/5 text-zinc-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Main Content Area */}
      <main className="glass flex-1 overflow-auto p-6 rounded-[24px] border border-white/5 shadow-inner">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'instructions' && <InstructionsTab items={instructions} nurses={nurses} onRefresh={loadAll} doctorId={doctor?.id || ''} onSelect={setSelectedItem} />}
            {activeTab === 'medications' && <MedicationsTab items={administered} onSelect={setSelectedItem} />}
            {activeTab === 'complaints' && <ComplaintsTab items={complaints} onRefresh={loadAll} onSelect={setSelectedItem} />}
            {activeTab === 'reports' && <ReportsTab items={reports} onSelect={setSelectedItem} />}
            {activeTab === 'predictions' && <PredictionsTab items={predictions} onSelect={setSelectedItem} />}
            {activeTab === 'staff' && <StaffTab nurses={nurses} units={units} patients={patients} onSelect={setSelectedItem} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Modals Orchestration */}
      <AnimatePresence>
        {showForm && (
          <NewOrderModal
            onClose={() => setShowForm(false)}
            onSubmit={loadAll}
            doctorId={doctor?.id || ''}
            patients={patients}
            nurses={nurses}
          />
        )}
        {showScanner && (
          <PatientScannerModal
            onClose={() => setShowScanner(false)}
            onSelect={() => {
              loadAll()
              setShowScanner(false)
              onNavigate('chronos')
            }}
            doctorId={doctor?.id || ''}
            allPatients={patients}
          />
        )}
        {selectedItem && (
          <ItemDetailModal 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
