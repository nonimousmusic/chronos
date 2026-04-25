import { useMemo } from 'react'
import { motion } from 'framer-motion'

/**
 * GPU-friendly ambient particle system that reacts to patient risk.
 * Particles shift from calm blue/green → angry red based on riskLevel (0-1).
 */

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  baseSpeed: number;
  delay: number;
  opacity: number;
  colorGroup: number;
}

interface AmbientParticlesProps {
  riskLevel?: number;
}

export default function AmbientParticles({ riskLevel = 0.5 }: AmbientParticlesProps) {
  const particles = useMemo(() => (
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      baseSpeed: Math.random() * 20 + 12,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.25 + 0.05,
      colorGroup: i % 3, // 0=green, 1=blue, 2=purple
    }))
  ), [])

  // Derive color intensity from risk
  const riskIntensity = Math.min(1, Math.max(0, riskLevel))
  const volatility = 0.5 + riskIntensity * 2.5 // calm=0.5, critical=3

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    }}>
      {particles.map((p: Particle) => {
        // Shift colors towards red/orange at high risk
        let color: string;
        if (riskIntensity > 0.7) {
          color = p.colorGroup === 0
            ? `rgba(255, 45, 85, ${p.opacity * 1.5})`
            : p.colorGroup === 1
              ? `rgba(255, 149, 0, ${p.opacity * 1.2})`
              : `rgba(255, 69, 58, ${p.opacity})`
        } else if (riskIntensity > 0.4) {
          color = p.colorGroup === 0
            ? `rgba(251, 191, 36, ${p.opacity * 1.2})`
            : p.colorGroup === 1
              ? `rgba(100, 210, 255, ${p.opacity})`
              : `rgba(191, 90, 242, ${p.opacity})`
        } else {
          color = p.colorGroup === 0
            ? `rgba(52, 211, 153, ${p.opacity})`
            : p.colorGroup === 1
              ? `rgba(100, 210, 255, ${p.opacity})`
              : `rgba(191, 90, 242, ${p.opacity * 0.7})`
        }

        const speed = p.baseSpeed / volatility

        return (
          <motion.div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: color,
              boxShadow: riskIntensity > 0.7
                ? `0 0 ${p.size * 3}px ${color}`
                : 'none',
              willChange: 'transform',
            }}
            animate={{
              y: [0, -30 * volatility, 10, -20 * volatility, 0],
              x: [0, 15 * volatility, -10 * volatility, 5, 0],
              opacity: [
                p.opacity,
                p.opacity * (1 + riskIntensity),
                p.opacity,
                p.opacity * (1 + riskIntensity * 0.5),
                p.opacity,
              ],
              scale: riskIntensity > 0.7
                ? [1, 1.3, 0.9, 1.2, 1]
                : [1, 1.05, 1, 1.02, 1],
            }}
            transition={{
              duration: speed,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}
