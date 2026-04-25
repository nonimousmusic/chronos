import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '@/supabaseClient'
import { Radio, Square } from 'lucide-react'
import { API_BASE, WS_URL } from '@/utils/config'
import { loadTelemetry, loadAuditTrail } from '@/data/sentinelLoader'

// Modular Components
import { VideoPlaybackCore } from '@/components/sentinel/modules/VideoPlaybackCore'
import { VitalsSync } from '@/components/sentinel/modules/SentinelPlaybackModules'
import { HashMatrix, MerkleTreeViz, HashMetrics } from '@/components/sentinel/modules/SentinelVisualizers'
import { StartOperationModal } from '@/components/sentinel/modules/OperationModals'
import VerificationPanel from '@/components/sentinel/VerificationPanel'
import AnomalyLog from '@/components/sentinel/AnomalyLog'

// Types
import { Patient, TelemetryFrame, AuditEntry, Vitals } from '@/types'

export default function SentinelView() {
  
  // -- Mode: "idle" | "live" | "review" --
  const [mode, setMode] = useState<'idle' | 'live' | 'review'>('idle')

  // -- Data State --
  const [patients, setPatients] = useState<Patient[]>([])
  const [showStartModal, setShowStartModal] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [activePatientId, setActivePatientId] = useState<string | null>(null)
  const [telemetry, setTelemetry] = useState<TelemetryFrame[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  
  // -- Live State --
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null)
  const [liveChain, setLiveChain] = useState<AuditEntry[]>([])
  const [liveVitals, setLiveVitals] = useState<Partial<Vitals> | null>(null)
  const [liveSeq, setLiveSeq] = useState(0)
  const [liveElapsed, setLiveElapsed] = useState(0)
  const [liveBatchCount, setLiveBatchCount] = useState(0)
  const [cameraMode, setCameraMode] = useState('webcam')
  
  // -- Operation State --
  const [validating, setValidating] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connectWebSocket = useCallback((url: string) => {
    if (wsRef.current) return
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'chain_update') {
        const vitals = data.vitals || {}
        setLiveSeq(data.seq)
        setLiveVitals({
          heart_rate: vitals.hr,
          spo2: vitals.spo2,
          bp_sys: vitals.bp_sys,
          map: vitals.map || (vitals.bp_sys ? vitals.bp_sys * 0.8 : 75)
        })
        setLiveElapsed(data.elapsed)
        setLiveBatchCount(data.batch_count)
        setLiveChain(prev => [...prev, data as AuditEntry].slice(-200))
      } else if (data.type === 'session_complete') {
        handleStopComplete(data)
      }
    }
    ws.onclose = () => { wsRef.current = null }
  }, [])

  const handleStopComplete = (data: any) => {
    setMode('review')
    setLiveSessionId(data.session_id)
    setIsPlaying(false)
    if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
    }
  }

  // Initialization
  useEffect(() => {
    async function init() {
      const [tel, aud, { data: pats }] = await Promise.all([
        loadTelemetry(),
        loadAuditTrail(),
        supabase.from('patients').select('*').order('id')
      ])
      setTelemetry(tel)
      setAudit(aud)
      if (pats) {
        setPatients(pats as Patient[])
        setSelectedPatientId(pats[0]?.id || '')
      }
      
      // Check for active backend session
      try {
        const res = await fetch(`${API_BASE}/api/status`)
        const statusData = await res.json()
          if (statusData.running) {
            setMode('live')
            setLiveSessionId(statusData.session_id)
            setActivePatientId(statusData.patient_id || null)
            setCameraMode('webcam')
            connectWebSocket(WS_URL)
          }
      } catch {}
    }
    init()
    return () => wsRef.current?.close()
  }, [connectWebSocket])

  // Time Sync for Video
  useEffect(() => {
    let raf: number
    const sync = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime)
      }
      raf = requestAnimationFrame(sync)
    }
    raf = requestAnimationFrame(sync)
    return () => cancelAnimationFrame(raf)
  }, [])

  const startOperation = async () => {
    setShowStartModal(false)
    setValidating(true)
    await new Promise(r => setTimeout(r, 1500))
    try {
      const res = await fetch(`${API_BASE}/api/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatientId }),
      })
      const startData = await res.json()
      if (res.ok) {
        setLiveSessionId(startData.session_id)
        setCameraMode('webcam')
        setLiveChain([])
        setLiveSeq(0)
        setMode('live')
        setActivePatientId(selectedPatientId)
        connectWebSocket(WS_URL)
      }
    } finally { setValidating(false) }
  }

  const handleStop = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: liveSessionId }),
      })
      const stopData = await res.json()
      handleStopComplete(stopData)
    } catch {}
  }

  const isLive = mode === 'live'
  const currentFrame: TelemetryFrame | any = isLive 
    ? { ...liveVitals, timestamp: liveElapsed } 
    : telemetry.find(t => Math.abs(t.timestamp - currentTime) < 0.3)

  return (
    <div className={`flex h-[calc(100vh-84px)] gap-4 p-4 overflow-hidden bg-[var(--bg-abyss)]`}>

      {/* Main Content (Visuals & Timeline) */}
      <div className="flex-[2] flex flex-col gap-4 min-w-0">
        <header className="flex justify-between items-center px-1">
          <div>
            <div className="text-[10px] text-zinc-500 font-mono tracking-[4px] font-black uppercase">Project Sentinel</div>
            <h1 className="text-xl font-black text-white tracking-tightest">Surgical Flight Recorder</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              isLive ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isLive ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <span className="text-[10px] font-black font-mono tracking-widest uppercase">{isLive ? 'Live Recording' : 'Standby'}</span>
            </div>

            {mode !== 'live' ? (
              <button 
                onClick={() => setShowStartModal(true)} 
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl font-black text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/10 uppercase"
              >
                <Radio size={14} /> Start Operation
              </button>
            ) : (
              <button 
                onClick={handleStop} 
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/40 text-red-500 rounded-xl font-black text-[10px] tracking-widest hover:bg-red-500/20 active:scale-95 transition-all uppercase"
              >
                <Square size={12} fill="currentColor" /> Stop Session
              </button>
            )}
          </div>
        </header>

        <HashMetrics 
          liveMode={isLive} idleMode={mode === 'idle'} 
          liveSeq={liveSeq} liveElapsed={liveElapsed} liveBatchCount={liveBatchCount} 
        />

        <VideoPlaybackCore
          ref={videoRef} isPlaying={isPlaying} currentTime={currentTime} duration={duration}
          onPlayPause={() => setIsPlaying(!isPlaying)} onLoadedMetadata={setDuration}
          currentFrame={currentFrame} onSeek={setCurrentTime}
          liveMode={isLive} idleMode={mode === 'idle'} validating={validating}
          cameraMode={cameraMode}
        />

        <VitalsSync frame={currentFrame} idleMode={mode === 'idle'} />

      </div>

      <div className="flex-1 flex flex-col gap-4 min-w-[360px] overflow-y-auto pr-1 scrollbar-hide">
        <HashMatrix auditTrail={isLive ? liveChain : audit} currentIdx={isLive ? liveSeq : 0} tamperActive={false} liveMode={isLive} />
        <VerificationPanel activeSessionId={liveSessionId} />
        <MerkleTreeViz auditTrail={isLive ? liveChain : audit} batches={[]} tamperActive={false} />
        {!isLive && <AnomalyLog anomalies={telemetry.filter(t => t.tags && t.tags.length > 0) as any} onJump={setCurrentTime} />}
      </div>

      <AnimatePresence>
        {showStartModal && (
          <StartOperationModal 
            onClose={() => setShowStartModal(false)} onConfirm={startOperation} 
            patients={patients} selectedId={selectedPatientId} setSelectedId={setSelectedPatientId} loading={validating}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
