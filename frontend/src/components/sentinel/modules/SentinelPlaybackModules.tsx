import React, { useState, useRef, useCallback } from 'react'

import { Heart, Activity, Droplets, Eye } from 'lucide-react'

// --- VITALS SYNC (Memoized for 60fps) ---
interface VitalsSyncProps {
  frame: any
  idleMode?: boolean
  liveMode?: boolean
}

const VITALS_CONFIG = [
  { key: 'heart_rate', label: 'Heart Rate', unit: 'BPM', icon: Heart, color: 'var(--accent-red)', critical: (v: number) => v > 110 },
  { key: 'spo2', label: 'SpO2', unit: '%', icon: Droplets, color: 'var(--accent-blue)', critical: (v: number) => v < 92 },
  { key: 'bp_sys', label: 'Sys. BP', unit: 'mmHg', icon: Activity, color: 'var(--accent-purple)', critical: (v: number) => v < 90 },
  { key: 'motion_score', label: 'Motion', unit: 'score', icon: Eye, color: 'var(--accent-amber)', critical: (v: number) => v > 30 },
]

export const VitalsSync = React.memo(({ frame, idleMode = false }: VitalsSyncProps) => {
  if (!frame) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {VITALS_CONFIG.map(v => (
          <div key={v.key} className="glass p-3 px-4">
            <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase font-bold">{v.label}</div>
            <div className="text-2xl font-black mt-1 text-zinc-700">--</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      {idleMode && (
        <div className="absolute -top-[11px] left-4 z-10 bg-cyan-400 text-black px-2 py-0.5 rounded-md text-[9px] font-black font-mono tracking-widest shadow-lg shadow-cyan-500/30">
          PRE-OP MONITORING // STANDBY VITALS
        </div>
      )}
      <div className={`grid grid-cols-4 gap-3 transition-all duration-500 ${idleMode ? 'opacity-70 grayscale-[0.5]' : 'opacity-100'}`}>
        {VITALS_CONFIG.map(cfg => {
          const value = frame[cfg.key]
          const isCritical = typeof value === 'number' && cfg.critical(value)
          const Icon = cfg.icon
          return (
            <div key={cfg.key} className={`glass p-3 px-4 relative overflow-hidden transition-colors ${
              isCritical ? 'border-red-500/40 bg-red-500/5' : 'border-white/5'
            }`}>
              {isCritical && (
                <div className="absolute inset-0 bg-radial-gradient from-red-500/20 to-transparent pointer-events-none" />
              )}
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={11} className={isCritical ? 'text-red-500' : 'text-zinc-500'} />
                <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase font-bold">{cfg.label}</span>
                {isCritical && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black font-display tracking-tight leading-none ${isCritical ? 'text-red-500' : 'text-white'}`}>
                  {typeof value === 'number' ? (cfg.key === 'motion_score' ? value.toFixed(1) : Math.round(value)) : '--'}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold">{cfg.unit}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

// --- MAGNETIC TIMELINE (Memoized) ---
interface MagneticTimelineProps {
  telemetry: any[]
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  anomalies: any[]
}

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

export const MagneticTimeline = React.memo(({ telemetry, currentTime, duration, onSeek, anomalies }: MagneticTimelineProps) => {
  const [hoverX, setHoverX] = useState<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    setHoverX(e.clientX - rect.left)
  }, [])

  const handleMouseLeave = () => setHoverX(null)

  const handleClick = (e: React.MouseEvent) => {
    if (!trackRef.current || duration <= 0) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(ratio * duration)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const getMagnification = (itemX: number) => {
    if (hoverX === null || !trackRef.current) return 1
    const trackWidth = trackRef.current.getBoundingClientRect().width
    const itemPx = (itemX / 100) * trackWidth
    const dist = Math.abs(hoverX - itemPx)
    const radius = 80
    if (dist > radius) return 1
    return 1 + (1 - dist / radius) * 1.5
  }

  return (
    <div className="glass p-3 px-4 rounded-2xl border border-white/5 relative bg-white/[0.01]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[9px] text-zinc-500 font-mono tracking-widest font-bold uppercase">TEMPORAL LOG</span>
        <span className="text-[10px] text-zinc-400 font-mono font-bold">
          {formatTime(currentTime)} <span className="text-zinc-600">/</span> {formatTime(duration)}
        </span>
      </div>

      <div className="h-10 relative mb-2 overflow-visible">
        <svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 grayscale opacity-40">
           {/* Sparklines */}
           <polyline fill="none" stroke="var(--accent-red)" strokeWidth="0.2" points={telemetry.map(t => `${duration > 0 ? (t.timestamp/duration)*100 : 0},${40 - ((t.heart_rate - 50) / 100) * 40}`).join(' ')} />
           <polyline fill="none" stroke="var(--accent-blue)" strokeWidth="0.2" points={telemetry.map(t => `${duration > 0 ? (t.timestamp/duration)*100 : 0},${40 - ((t.spo2 - 80) / 20) * 40}`).join(' ')} />
        </svg>
      </div>

      <div ref={trackRef} onClick={handleClick} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="relative h-5 cursor-pointer flex items-center group">
        <div className="absolute left-0 right-0 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-100 linear" style={{ width: `${progress}%` }} />
        </div>

        {anomalies.map((a, i) => {
          const x = duration > 0 ? (a.timestamp / duration) * 100 : 0
          const mag = getMagnification(x)
          return (
            <div key={i} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" style={{ left: `${x}%`, transform: `translate(-50%, -50%) scale(${mag})` }} />
          )
        })}

        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-20" style={{ left: `${progress}%` }} />

        {hoverX !== null && trackRef.current && (
           <div className="absolute top-[-50px] -translate-x-1/2 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap z-50 shadow-2xl backdrop-blur-md" style={{ left: `${hoverX}px` }}>
              <span className="text-white font-black">{formatTime((hoverX / trackRef.current.getBoundingClientRect().width) * duration)}</span>
           </div>
        )}
      </div>
    </div>
  )
})
