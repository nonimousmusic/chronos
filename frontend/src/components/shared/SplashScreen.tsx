import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  duration: number;
  delay: number;
}

interface SplashScreenProps {
  onComplete: () => void;
  userName?: string;
}

export default function SplashScreen({ onComplete, userName }: SplashScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'tagline' | 'exit'>('logo') // logo → tagline → exit
  const showParticles = true

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('tagline'), 1200)
    const t2 = setTimeout(() => setPhase('exit'), 2800)
    const t3 = setTimeout(() => onComplete(), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  // Generate burst particles
  const particles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    angle: (i / 24) * 360,
    distance: 60 + Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 0.8 + Math.random() * 0.6,
    delay: Math.random() * 0.3,
  }))

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'exit' ? 0 : 1 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--splash-bg)',
          pointerEvents: phase === 'exit' ? 'none' : 'auto',
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 40%, rgba(52, 211, 153, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 60% 60%, rgba(100, 210, 255, 0.05) 0%, transparent 50%)
          `,
        }} />

        {/* Particle burst */}
        {showParticles && (
          <div style={{ position: 'absolute', pointerEvents: 'none' }}>
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 0,
                  scale: 0.5,
                }}
                animate={{
                  x: Math.cos(p.angle * Math.PI / 180) * p.distance,
                  y: Math.sin(p.angle * Math.PI / 180) * p.distance,
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.2, 0],
                }}
                transition={{
                  duration: p.duration,
                  delay: 0.8 + p.delay,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  background: p.id % 3 === 0
                    ? '#34d399'
                    : p.id % 3 === 1
                      ? '#64d2ff'
                      : '#bf5af2',
                  boxShadow: `0 0 8px ${p.id % 3 === 0 ? 'rgba(52,211,153,0.6)' : p.id % 3 === 1 ? 'rgba(100,210,255,0.6)' : 'rgba(191,90,242,0.6)'}`,
                }}
              />
            ))}
          </div>
        )}

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -15, filter: 'blur(12px)' }}
          animate={{
            opacity: 1,
            scale: [0.6, 1.08, 1],
            rotate: [- 15, 3, 0],
            filter: 'blur(0px)',
          }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', marginBottom: '24px' }}
        >
          <img
            src="/images/MasterBrandLogo.png"
            alt="Synapse GTB"
            style={{
              height: '72px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 30px rgba(52, 211, 153, 0.3))',
            }}
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{
            fontSize: '32px',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.5px',
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          {userName ? `Welcome, ${userName.split(' ')[0]}` : 'Synapse GTB'}
        </motion.h1>

        {/* Tagline with typewriter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: phase === 'tagline' || phase === 'exit' ? 1 : 0, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '3px',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
          }}
        >
          {userName ? 'INITIALIZING CLINICAL COMMAND CENTER' : 'DIGITAL TWIN COMMAND CENTER'}
        </motion.div>

        {/* Loading bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '200px' }}
          transition={{ duration: 2.5, ease: 'easeInOut' }}
          style={{
            height: '2px',
            borderRadius: '1px',
            background: 'linear-gradient(90deg, var(--color-stable), var(--accent-cyan))',
            marginTop: '36px',
            boxShadow: '0 0 12px rgba(52, 211, 153, 0.4)',
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
