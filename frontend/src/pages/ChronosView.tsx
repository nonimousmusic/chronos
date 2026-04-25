import { useState, useCallback, useEffect, useRef } from 'react'

// Modular Components (Refactored to @/ alias)
import HumanModel3D from '@/components/chronos/HumanModel3D'
import TriageRadar from '@/components/chronos/TriageRadar'
import CrashOdometer from '@/components/chronos/CrashOdometer'
import ShapExplainer from '@/components/chronos/ShapExplainer'
import VitalsTicker from '@/components/chronos/VitalsTicker'

// Data & Utils
import { patients } from '@/data/patientRegistry'
import { playCriticalBeep, playNavClick } from '@/utils/sounds'
import { predictRisk, checkMLStatus } from '@/utils/chronosML'

// Types
import { Patient, Vitals, ShapValue, RiskScores } from '@/types'

interface ChronosViewProps {
  onRiskChange: (risk: number) => void
}

export default function ChronosView({ onRiskChange }: ChronosViewProps) {
  const [selectedId, setSelectedId] = useState((patients as Patient[])[0].id)
  
  // Typed State
  const [livePatients, setLivePatients] = useState<Patient[]>(patients as Patient[])
  const [liveVitals, setLiveVitals] = useState<Vitals>((patients as Patient[])[0].currentVitals)
  const [liveHistory, setLiveHistory] = useState<Vitals[]>((patients as Patient[])[0].vitalHistory)
  const vitalsRef = useRef<Vitals>((patients as Patient[])[0].currentVitals)
  const [mlAvailable, setMlAvailable] = useState(false)
  const [liveShap, setLiveShap] = useState<ShapValue[] | null>(null)
  
  const timeIndexRef = useRef(0)


  // ML Readiness Check
  useEffect(() => {
    checkMLStatus().then(status => {
      setMlAvailable(status.loaded)
      console.log(`[Chronos] ML Engine Ready: ${status.loaded}`)
    })
  }, [])

  // Risk & ML Inference Loop (Production Mode)
  useEffect(() => {
    if (!mlAvailable) return

    const interval = setInterval(async () => {
      const selectedPatient = livePatients.find(p => p.id === selectedId) || livePatients[0]
      const currentVitals = vitalsRef.current

      // ── Map features to the 73-vector schema ──
      // Note: In production, these are derived from timeseries analytics. 
      // Here we map the primary 5 + demographics + smart defaults.
      const features: Record<string, any> = {
        anchor_age: selectedPatient.age,
        hr: currentVitals.heart_rate,
        spo2: currentVitals.spo2,
        map_mean: currentVitals.map || 75,
        rr: currentVitals.respiratory_rate || 16,
        temp_c: 37.0,
        sbp: (currentVitals.map || 75) * 1.25,
        dbp: (currentVitals.map || 75) * 0.85,
        shock_index: currentVitals.heart_rate / ((currentVitals.map || 75) * 1.25),
        lactate: currentVitals.lactate || 1.1,
        // Fill remaining features with null/defaults for backend imputer
        observed_hours_in_window: 24
      }

      const prediction = await predictRisk(features)
      if (prediction) {
        setLiveShap(prediction.shap_values)
        
        // Update the patient risk score in the live list
        setLivePatients(prev => prev.map(p => {
          if (p.id === selectedId) {
            return {
              ...p,
              aggregateRisk: prediction.aggregate_risk,
              riskScores: prediction.risk_scores as RiskScores
            }
          }
          return p
        }))
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [selectedId, mlAvailable, livePatients])

  const selectedPatient = livePatients.find(p => p.id === selectedId) || livePatients[0]

  // Sync Global Risk Level for Particles
  useEffect(() => {
    if (onRiskChange && selectedPatient) {
      onRiskChange(selectedPatient.aggregateRisk)
    }
  }, [selectedPatient?.aggregateRisk, onRiskChange])

  // Vitals Stream Simulation
  useEffect(() => {
    setLiveVitals(selectedPatient.currentVitals)
    setLiveHistory(selectedPatient.vitalHistory)
    vitalsRef.current = selectedPatient.currentVitals
    timeIndexRef.current = selectedPatient.vitalHistory.length
  }, [selectedId])

  useEffect(() => {
    const interval = setInterval(() => {
      const timeseries = selectedPatient.realTimeSeries || []
      if (timeseries.length === 0) return
      
      const nextIdx = timeIndexRef.current >= timeseries.length ? 0 : timeIndexRef.current
      const nextReal = timeseries[nextIdx]
      timeIndexRef.current = nextIdx + 1

      const next: Vitals = {
        heart_rate: nextReal.heart_rate ?? vitalsRef.current.heart_rate,
        spo2: nextReal.spo2 ?? vitalsRef.current.spo2,
        map: nextReal.map ?? vitalsRef.current.map,
        lactate: nextReal.lactate ?? vitalsRef.current.lactate,
        respiratory_rate: nextReal.respiratory_rate ?? vitalsRef.current.respiratory_rate,
        bp_sys: nextReal.bp_sys ?? vitalsRef.current.bp_sys,
      }

      vitalsRef.current = next
      setLiveVitals(next)
      setLiveHistory(prev => [...prev, next].slice(-30))
    }, 1500)
    return () => clearInterval(interval)
  }, [selectedId])

  const handleSelectPatient = useCallback((patient: Patient) => {
    playNavClick()
    if (patient.status === 'critical') playCriticalBeep()
    setSelectedId(patient.id)
  }, [])

  return (
    <div className="grid grid-cols-[1fr_380px] grid-rows-[1fr_auto] gap-4 h-[calc(100vh-84px)] p-4 relative z-10 bg-[var(--bg-abyss)] overflow-hidden">
      {/* Center Section */}
      <div className="flex flex-col gap-4 min-h-0">
        <header className="flex justify-between items-center px-1">
          <div>
            <div className="text-[10px] text-zinc-500 font-mono tracking-[4px] font-black uppercase">Project Chronos</div>
            <h1 className="text-xl font-black text-white tracking-tightest">ICU Predictive Command Center</h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusIndicator status={selectedPatient.status} />
            <span className="text-[9px] font-mono text-zinc-600 tracking-widest bg-white/5 px-2 py-1 rounded">0xCHAIN_anchor...</span>
            <CrashOdometer value={selectedPatient.aggregateRisk} />
          </div>
        </header>

        {/* 3D Visualizer */}
        <div className="glass flex-1 min-h-0 relative overflow-hidden rounded-[32px] border border-white/5">
          <HumanModel3D
            highlightOrgan={selectedPatient.highlightOrgan || undefined}
            riskLevel={selectedPatient.aggregateRisk}
          />
          {/* Info Card Overlay */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-3 w-80 z-40">
            <div className="glass px-6 py-5 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col items-center border border-white/10 text-center bg-black/40 backdrop-blur-xl">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-brand-accent)]" />
              <div className="text-[9px] text-[var(--color-brand-accent)] font-mono tracking-[4px] font-black mb-1 uppercase">PATIENT_FOCUS</div>
              <div className="text-xl font-black text-white">
                Bed {selectedPatient.bed} <span className="text-zinc-600 mx-1">•</span> {selectedPatient.name}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2 font-medium">
                <span className="truncate">{selectedPatient.admitReason}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                <span>Age {selectedPatient.age}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight Bar */}
        <div className="glass p-5 rounded-[24px] border border-white/5 bg-white/[0.01]">
          <ShapExplainer
            features={liveShap && selectedPatient.id === selectedId
              ? liveShap
              : selectedPatient.shapFeatures
            }
            patientId={selectedPatient.id}
            isLive={mlAvailable}
          />
        </div>

        {/* Live Vitals Ticker */}
        <div className="h-24">
          <VitalsTicker vitals={liveVitals} history={liveHistory} status={selectedPatient.status || 'stable'} />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="flex flex-col min-h-0">
        <TriageRadar
          patients={livePatients}
          selected={selectedPatient}
          onSelect={handleSelectPatient}
        />
      </div>

    </div>
  )
}

function StatusIndicator({ status }: { status: Patient['status'] }) {
  const isCritical = status === 'critical'
  const isObserving = status === 'observing'
  
  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-all ${
      isCritical ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
      isObserving ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 
      'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
    }`}>
      <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
        isCritical ? 'bg-red-500 animate-[pulse-dot_1s_infinite]' : 
        isObserving ? 'bg-amber-500 animate-[pulse-dot_2s_infinite]' : 
        'bg-emerald-500'
      }`} />
      <span className="text-[10px] font-black font-mono tracking-widest uppercase">{status}</span>
    </div>
  )
}
