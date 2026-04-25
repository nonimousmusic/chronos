import React, { forwardRef, useState, useRef, useEffect } from 'react'
import { RotateCcw, Play, Pause, Gauge, Heart, Droplets, Activity as ActivityIcon } from 'lucide-react'
import { API_BASE } from '@/utils/config'
import { TelemetryFrame } from '@/types'

interface VideoPlaybackCoreProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onLoadedMetadata: (duration: number) => void
  currentFrame: TelemetryFrame | { heart_rate?: number; timestamp?: number; [key: string]: any } | null
  onSeek: (time: number) => void
  liveMode?: boolean
  demoMode?: boolean
  idleMode?: boolean
  validating?: boolean
  cameraMode?: string
  totalFrames?: number
  currentFrameIdx?: number
  reviewVitals?: any
}

const SPEEDS = [0.5, 1, 1.5, 2]

export const VideoPlaybackCore = forwardRef<HTMLVideoElement, VideoPlaybackCoreProps>(({
  isPlaying, currentTime, onPlayPause, onLoadedMetadata, currentFrame,
  liveMode = false, demoMode = false, idleMode = false, validating = false,
  cameraMode = 'webcam', currentFrameIdx = 0, reviewVitals = null
}, ref) => {
  const [speed, setSpeed] = useState(1)
  const cctvRef = useRef<HTMLVideoElement>(null)
  const [streamError, setStreamError] = useState(false)
  const [useFramePlayback, setUseFramePlayback] = useState(false)
  const [lastSessionId, setLastSessionId] = useState<string | null>(null)
  const useCloudDemoVideo = cameraMode === 'cloud-demo'

  useEffect(() => {
    if (!liveMode && !demoMode && currentFrame && 'session_id' in currentFrame && !useCloudDemoVideo) {
       setUseFramePlayback(true)
       setLastSessionId(currentFrame.session_id as string)
    } else {
       setUseFramePlayback(false)
    }
  }, [liveMode, demoMode, currentFrame, useCloudDemoVideo])

  useEffect(() => {
    if (!demoMode || !cctvRef.current) return
    if (isPlaying) cctvRef.current.play().catch(() => {})
    else cctvRef.current.pause()
  }, [isPlaying, demoMode])

  useEffect(() => {
    if (!demoMode || !cctvRef.current) return
    if (!isPlaying || Math.abs(cctvRef.current.currentTime - currentTime) > 0.5) {
      cctvRef.current.currentTime = currentTime
    }
  }, [currentTime, isPlaying, demoMode])

  const showHrOverlay = currentFrame && 'tags' in currentFrame && (currentFrame as TelemetryFrame).tags?.some(t => t.type === 'HR_SPIKE')

  const handleCycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    setSpeed(next)
    const video = (ref as React.RefObject<HTMLVideoElement>)?.current
    if (video) video.playbackRate = next
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="glass flex-1 min-h-0 relative overflow-hidden flex p-1 rounded-[24px]">
        {demoMode && (
          <div className="flex w-full h-full">
            <div className="flex-1 relative bg-black border-r border-white/5">
              <video ref={ref} onLoadedMetadata={(e) => onLoadedMetadata((e.target as HTMLVideoElement).duration)} className="w-full h-full object-contain">
                <source src="/video/videoplayback - Trim.mp4" type="video/mp4" />
              </video>
              <div className="absolute top-3 left-4 z-10 bg-black/60 backdrop-blur-md p-1 px-3 rounded-lg border border-white/10 flex items-center gap-2 text-[10px] font-mono font-bold text-white uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> CAM 01 // LAPAROSCOPIC
              </div>
              {showHrOverlay && (
                <div className="absolute top-[15%] right-[10%] p-2 px-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-500 font-mono text-[10px] font-black animate-pulse backdrop-blur-md">
                  ⚡ HR SPIKE: {currentFrame?.heart_rate?.toFixed(0)} BPM
                </div>
              )}
            </div>
            <div className="flex-1 relative bg-black">
              <video ref={cctvRef} muted className="w-full h-full object-contain grayscale-[0.3] contrast-[1.1]">
                <source src="/video/real video - Trim.mp4" type="video/mp4" />
              </video>
              <div className="absolute top-3 left-4 z-10 bg-black/60 backdrop-blur-md p-1 px-3 rounded-lg border border-white/10 flex items-center gap-2 text-[10px] font-mono font-bold text-white uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> CAM 02 // WIDE OR
              </div>
            </div>
          </div>
        )}

        {idleMode && !validating && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-slate-900">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-bounce">
               <RotateCcw size={32} className="text-zinc-700 opacity-30" />
            </div>
            <div className="text-center">
              <div className="text-[10px] text-cyan-400 font-mono tracking-[4px] font-black mb-2 uppercase">Core // Standby</div>
              <h3 className="text-lg font-bold text-zinc-400">Awaiting Initialization</h3>
            </div>
          </div>
        )}

        {validating && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-black">
             <div className="relative">
                <div className="w-28 h-28 rounded-full border-2 border-emerald-500/10 flex items-center justify-center">
                   <div className="w-24 h-24 rounded-full border-b-2 border-emerald-500 animate-spin" />
                </div>
                <ActivityIcon size={32} className="absolute inset-0 m-auto text-emerald-500 animate-bounce" />
             </div>
             <div className="text-center">
                <span className="font-mono text-[12px] text-emerald-500 font-black tracking-[5px] uppercase">Validating Integrity...</span>
                <div className="mt-4 w-60 h-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-1/2 animate-pulse" />
                </div>
             </div>
          </div>
        )}

        {liveMode && (
          <div className="flex-1 relative bg-black">
             {useCloudDemoVideo ? (
               <video autoPlay muted loop playsInline className="w-full h-full object-contain">
                  <source src="/video/videoplayback - Trim.mp4" type="video/mp4" />
               </video>
             ) : (
               <img 
                  src={streamError ? `${API_BASE}/api/snapshot?t=${Date.now()}` : `${API_BASE}/api/stream?t=${Date.now()}`} 
                  className="w-full h-full object-contain" 
                  onError={() => {
                    setStreamError(true)
                    // Attempt retry after reset
                    setTimeout(() => setStreamError(false), 2000)
                  }} 
                  alt="Live Surgical Stream"
                />
             )}
             <div className="absolute top-3 left-4 z-10 bg-black/60 backdrop-blur-md p-1 px-3 rounded-lg border border-white/10 flex items-center gap-2 text-[10px] font-mono font-bold text-white uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE // {cameraMode}
             </div>
          </div>
        )}

        {!liveMode && !demoMode && !idleMode && !validating && (
          <div className="flex-1 flex">
            <div className={`relative bg-black ${useFramePlayback ? 'flex-[2] border-r border-white/5' : 'flex-1'}`}>
               {useFramePlayback && currentFrame && 'frame_idx' in currentFrame ? (
                 <img key={`frame-${currentFrame.frame_idx}`} src={`${API_BASE}/api/frame/${lastSessionId}/${currentFrame.frame_idx}`} className="w-full h-full object-contain" alt={`Frame ${currentFrame.frame_idx}`} />
               ) : (
                 <video ref={ref} onLoadedMetadata={(e) => onLoadedMetadata((e.target as HTMLVideoElement).duration)} className="w-full h-full object-contain">
                    <source src="/video/videoplayback - Trim.mp4" type="video/mp4" />
                 </video>
               )}
            </div>
            {useFramePlayback && reviewVitals && (
               <div className="flex-1 p-6 flex flex-col justify-center gap-4 bg-zinc-950/50">
                  <header className="text-[10px] font-bold text-cyan-500 font-mono tracking-widest border-b border-white/5 pb-2 mb-2 uppercase">Frame_{currentFrameIdx + 1}_Telemetry</header>
                  <VitalEntry icon={Heart} label="HEART RATE" value={reviewVitals.hr} unit="BPM" color="text-red-500" />
                  <VitalEntry icon={Droplets} label="SpO2" value={reviewVitals.spo2} unit="%" color="text-blue-500" />
                  <VitalEntry icon={ActivityIcon} label="BP" value={`${reviewVitals.bp_sys}/${reviewVitals.bp_dia}`} unit="mmHg" color="text-emerald-500" />
               </div>
            )}
          </div>
        )}

        {/* Controls Overlay */}
        {!liveMode && !idleMode && !validating && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 px-4 bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
              <button onClick={() => { if ((ref as any).current) (ref as any).current.currentTime = 0 }} className="p-2 text-zinc-400 hover:text-white transition-colors" title="Restart"><RotateCcw size={15} /></button>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={onPlayPause} className="w-9 h-9 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-md">
                {isPlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="ml-0.5" />}
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={handleCycleSpeed} className="text-[10px] font-mono font-black text-cyan-400 px-2 flex items-center gap-1.5 hover:text-white transition-colors">
                <Gauge size={12} /> {speed}x
              </button>
          </div>
        )}
      </div>
    </div>
  )
})

interface VitalEntryProps {
  icon: any
  label: string
  value: string | number
  unit: string
  color: string
}

const VitalEntry = ({ icon: Icon, label, value, unit, color }: VitalEntryProps) => (
  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
    <div className="flex items-center gap-1.5 mb-1 opacity-60">
      <Icon size={12} className={color} />
      <span className="text-[9px] font-black font-mono tracking-widest uppercase">{label}</span>
    </div>
    <div className={`text-2xl font-black ${color}`}>
      {value} <span className="text-[10px] text-zinc-500">{unit}</span>
    </div>
  </div>
)
