import { useState, useEffect, useRef } from 'react'
import { Clock, Shield, Cpu } from 'lucide-react'

export default function StatusBar() {
  const [time, setTime] = useState<Date>(new Date())
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [fps, setFps] = useState<number>(60)
  const framesRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(performance.now())

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // FPS counter
  useEffect(() => {
    let rafId: number;
    const measureFps = (now: number) => {
      framesRef.current++
      if (now - lastTimeRef.current >= 1000) {
        setFps(framesRef.current)
        framesRef.current = 0
        lastTimeRef.current = now
      }
      rafId = requestAnimationFrame(measureFps)
    }
    rafId = requestAnimationFrame(measureFps)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const timeStr = time.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit', 
    second: '2-digit',
    hour12: true,
  })

  return (
    <div className="status-footer">
      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: isOnline ? 'var(--color-stable)' : 'var(--color-critical)',
          boxShadow: isOnline ? '0 0 6px rgba(52,211,153,0.5)' : '0 0 6px rgba(255,45,85,0.5)',
        }} />
        <span>{isOnline ? 'CONNECTED' : 'OFFLINE'}</span>
      </div>

      <div style={{ width: '1px', height: '12px', background: 'var(--glass-border)' }} />

      {/* Encryption */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Shield size={10} />
        <span>AES-256</span>
      </div>

      <div style={{ width: '1px', height: '12px', background: 'var(--glass-border)' }} />

      {/* FPS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Cpu size={10} />
        <span>{fps} FPS</span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={10} />
        <span>{timeStr} IST</span>
      </div>
    </div>
  )
}
