import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Stethoscope, Mail, Lock, User, ArrowRight, AlertCircle, Loader2, CheckCircle2, Zap, LayoutDashboard, HeartPulse, LucideIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import ThemeToggle from '../shared/ThemeToggle'

type Phase = 'input' | 'verifying' | 'success';

const PHASES: Record<string, Phase> = {
  INPUT: 'input',
  VERIFYING: 'verifying',
  SUCCESS: 'success',
}

interface Credential {
  email: string;
  password: string;
  name: string;
}

const PREFILLED: Record<string, Credential> = {
  doctor: { email: 'doc@synapse.med', password: 'password123', name: 'Dr. Sarah Chen' },
  nurse: { email: 'nurse@synapse.med', password: 'password123', name: 'Nurse Thompson' },
  patient: { email: 'patient@synapse.med', password: 'password123', name: 'R. Sharma (P-1042)' },
}

/**
 * Particle system for background
 */
function AuthParticles() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.3 + 0.05,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.id % 3 === 0
              ? 'var(--particle-green)'
              : p.id % 3 === 1
                ? 'var(--particle-blue)'
                : 'var(--particle-purple)',
          } as any}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/**
 * DNA Helix animation
 */
function DNAHelix() {
  const strands = Array.from({ length: 12 }, (_, i) => i)
  return (
    <div style={{
      position: 'absolute',
      right: '-80px',
      top: '50%',
      transform: 'translateY(-50%)',
      opacity: 0.06,
      pointerEvents: 'none',
    }}>
      {strands.map(i => (
        <motion.div
          key={i}
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: 'var(--color-stable)',
            position: 'absolute',
          } as any}
          animate={{
            x: [Math.sin(i * 0.5) * 40, Math.sin(i * 0.5 + Math.PI) * 40],
            y: [i * 30, i * 30],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Scanning line effect during verification
 */
function ScanLine({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: '2px',
        background: `linear-gradient(90deg, transparent, var(--color-stable), transparent)`,
        zIndex: 10,
        pointerEvents: 'none',
      } as any}
      initial={{ top: '0%' }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
    />
  )
}

export default function DoctorQuickAuth() {
  const { login, signup } = useAuth()
  const [phase, setPhase] = useState<Phase>(PHASES.INPUT as Phase)
  const [role, setRole] = useState<string>('doctor') // 'doctor', 'nurse', 'patient'
  
  // Auth Form State
  const [isLogin, setIsLogin] = useState<boolean>(true)
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  
  const [scanProgress, setScanProgress] = useState<number>(0)
  const [displayedName, setDisplayedName] = useState<string>('Doctor')

  // Auto-fill credentials when role changes
  useEffect(() => {
    if (isLogin && PREFILLED[role]) {
      setEmail(PREFILLED[role].email)
      setPassword(PREFILLED[role].password)
    }
  }, [role, isLogin])

  // Simulate verification scan
  useEffect(() => {
    if (phase !== PHASES.VERIFYING) return
    setScanProgress(0)
    const steps = [
      { progress: 15, delay: 200 },
      { progress: 35, delay: 500 },
      { progress: 58, delay: 900 },
      { progress: 76, delay: 1300 },
      { progress: 89, delay: 1600 },
      { progress: 100, delay: 2000 },
    ]

    const timers = steps.map(step =>
      setTimeout(() => setScanProgress(step.progress), step.delay)
    )

    return () => timers.forEach(clearTimeout)
  }, [phase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email and password required')
      return
    }
    
    if (!isLogin && !name.trim()) {
       setError('Full name is required for registration')
       return
    }

    setPhase(PHASES.VERIFYING as Phase)
    setDisplayedName(isLogin ? (PREFILLED[role]?.name || email.split('@')[0]) : name)

    try {
      await new Promise(resolve => setTimeout(resolve, 2200)) 
      
      let res: any;
      if (isLogin) {
        try {
          res = await login(email.trim(), password)
        } catch (loginErr: any) {
          // Auto-provision: if credentials don't exist, create the account automatically
          if (loginErr.message?.includes('Invalid login credentials')) {
            const displayName = PREFILLED[role]?.name || name || email.split('@')[0]
            res = await signup(email.trim(), password, displayName, { role })
            if (res.user && !res.session) {
              try {
                res = await login(email.trim(), password)
              } catch (_) {
                // Handled
              }
            }
          } else {
            throw loginErr
          }
        }
      } else {
        res = await signup(email.trim(), password, name.trim(), { role })
        if (res.user && res.session === null) {
          throw new Error("Check your email for confirmation link.")
        }
      }
      
      if (res?.user?.user_metadata?.name) {
         setDisplayedName(res.user.user_metadata.name)
      }

      if (res?.isGuest) {
        setPhase(PHASES.SUCCESS as Phase)
        setError('Rate limit exceeded. Activated Guest Mode for demo.')
      } else {
        setPhase(PHASES.SUCCESS as Phase)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Make sure user exists.')
      setPhase(PHASES.INPUT as Phase)
    }
  }

  const verifySteps = [
    { label: 'Initializing secure handshake', threshold: 10 },
    { label: 'Verifying with biometric vault', threshold: 30 },
    { label: 'Cross-referencing database', threshold: 55 },
    { label: 'Establishing encrypted session', threshold: 75 },
    { label: `Granting ${role} privileges`, threshold: 90 },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px 14px 44px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 300ms',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-display)',
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--input-focus-border)'
    e.target.style.boxShadow = `0 0 0 3px var(--input-focus-ring)`
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--input-border)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-abyss)',
      fontFamily: 'var(--font-display)',
      overflow: 'hidden',
      zIndex: 9999,
    }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at 25% 25%, var(--ambient-g1) 0%, transparent 50%),
          radial-gradient(ellipse at 75% 75%, var(--ambient-g2) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, var(--ambient-g3) 0%, transparent 60%)
        `,
      }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(var(--grid-line) 1px, transparent 1px),
          linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        pointerEvents: 'none',
      }} />

      <AuthParticles />
      <DNAHelix />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="glass-shimmer"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          padding: '40px',
          borderRadius: '24px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid var(--glass-border)',
          boxShadow: `
            0 0 0 1px rgba(52, 211, 153, 0.05),
            0 25px 80px rgba(0, 0, 0, 0.3),
            0 0 120px rgba(52, 211, 153, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.04)
          `,
          overflow: 'hidden',
        } as any}
      >
        <ScanLine active={phase === PHASES.VERIFYING} />

        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '1px',
          background: `linear-gradient(90deg, transparent, var(--color-stable), transparent)`,
        }} />

        <AnimatePresence mode="wait">
          {phase === PHASES.INPUT && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <motion.div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '20px',
                    background: `linear-gradient(135deg, var(--color-stable-bg), rgba(100, 210, 255, 0.08))`,
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  } as any}
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(52, 211, 153, 0.1)',
                      '0 0 40px rgba(52, 211, 153, 0.2)',
                      '0 0 20px rgba(52, 211, 153, 0.1)',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <ShieldCheck size={32} color="var(--color-stable)" strokeWidth={1.5} />
                </motion.div>

                <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {isLogin ? 'Secure Gateway' : 'Identity Registration'}
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
                  SYNAPSE GTB // {role.toUpperCase()}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '12px', border: '1px solid var(--color-border-subtle)' }}>
                {[
                  { id: 'doctor', icon: Stethoscope, label: 'Doctor' },
                  { id: 'nurse', icon: LayoutDashboard, label: 'Nurse' },
                  { id: 'patient', icon: HeartPulse, label: 'Patient' }
                ].map(r => {
                  const Icon = r.icon as LucideIcon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => { setRole(r.id); setIsLogin(true); setError(''); }}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600,
                        background: role === r.id ? 'var(--color-stable-bg)' : 'transparent',
                        color: role === r.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        border: role === r.id ? '1px solid var(--color-stable)' : '1px solid transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icon size={16} color={role === r.id ? 'var(--color-stable)' : 'currentColor'} />
                      {r.label}
                    </button>
                  )
                })}
              </div>

              <form onSubmit={handleSubmit}>
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                        Full Name
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Full Name"
                          style={inputStyle}
                          onFocus={handleInputFocus}
                          onBlur={handleInputBlur}
                        />
                        <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                    {role === 'patient' ? 'Patient Email' : 'Medical Email'} (Pre-filled for Demo)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="account@hospital.org"
                      style={inputStyle}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                    <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                    Cryptographic Key
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      style={{ ...inputStyle, letterSpacing: '2px' }}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px',
                        background: 'var(--color-critical-bg)', border: '1px solid rgba(255, 45, 85, 0.2)',
                        marginBottom: '16px', fontSize: '13px', color: 'var(--color-critical)',
                      }}
                    >
                      <AlertCircle size={16} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  style={{
                    width: '100%', padding: '15px 24px', borderRadius: '14px', border: 'none',
                    background: role === 'doctor' ? 'linear-gradient(135deg, var(--color-stable), #22c55e)' : 
                               role === 'nurse' ? 'linear-gradient(135deg, var(--accent-cyan), #38bdf8)' :
                               'linear-gradient(135deg, var(--accent-purple), #c084fc)',
                    color: '#022c22', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    transition: 'all 300ms', boxShadow: '0 4px 20px rgba(0,0,0, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                    letterSpacing: '0.3px',
                  }}
                >
                  <Zap size={18} strokeWidth={2.5} />
                  {isLogin ? `Log in as ${role.charAt(0).toUpperCase() + role.slice(1)}` : 'Register Identity'}
                  <ArrowRight size={18} />
                </motion.button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                 <button 
                  onClick={() => setIsLogin(!isLogin)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-accent)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-display)' }}
                >
                  {isLogin ? "Don't have clearance? Click to register" : "Already have clearance? Click to login"}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', lineHeight: 1.6 }}>
                  🔐 SUPABASE SECURE PROTOCOL<br />
                  256-BIT AES ENCRYPTED SESSION
                </p>
              </div>
            </motion.div>
          )}

          {phase === PHASES.VERIFYING && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                style={{
                  width: '88px', height: '88px', borderRadius: '50%', background: 'var(--color-stable-bg)',
                  border: '2px solid rgba(52, 211, 153, 0.3)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 28px',
                } as any}
                animate={{
                  boxShadow: [
                    '0 0 0 0px rgba(52, 211, 153, 0.2), 0 0 30px rgba(52, 211, 153, 0.1)',
                    '0 0 0 15px rgba(52, 211, 153, 0), 0 0 50px rgba(52, 211, 153, 0.2)',
                    '0 0 0 0px rgba(52, 211, 153, 0.2), 0 0 30px rgba(52, 211, 153, 0.1)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Stethoscope size={36} color="var(--color-stable)" strokeWidth={1.5} />
                </motion.div>
              </motion.div>

              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {isLogin ? 'Verifying Credentials' : 'Registering Identity'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '28px' }}>
                {email.toUpperCase()} // SUPABASE AUTH
              </p>

              <div style={{ width: '100%', height: '3px', borderRadius: '2px', background: 'var(--risk-bar-bg)', marginBottom: '24px', overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', borderRadius: '2px', background: `linear-gradient(90deg, var(--color-stable), var(--accent-cyan))` }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>

              <div style={{ textAlign: 'left' }}>
                {verifySteps.map((step, i) => {
                  const isActive = scanProgress >= step.threshold
                  const isDone = i < verifySteps.length - 1
                    ? scanProgress >= verifySteps[i + 1].threshold
                    : scanProgress >= 100

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
                        fontSize: '12px', fontFamily: 'var(--font-mono)',
                        color: isDone ? 'var(--color-stable)' : isActive ? 'var(--text-primary)' : 'var(--text-dim)',
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2 size={14} color="var(--color-stable)" />
                      ) : isActive ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                          <Loader2 size={14} color="var(--accent-cyan)" />
                        </motion.div>
                      ) : (
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--text-dim)' }} />
                      )}
                      {step.label}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {phase === PHASES.SUCCESS && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center', padding: '20px 0' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-stable-bg)',
                  border: '2px solid rgba(52, 211, 153, 0.4)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(52, 211, 153, 0.15)',
                }}
              >
                <CheckCircle2 size={36} color="var(--color-stable)" strokeWidth={2} />
              </motion.div>

              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-stable)', marginBottom: '8px' }}>
                Access Granted
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                Welcome, {displayedName}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                Redirecting...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.4 }}>
        <img src="/images/MasterBrandLogo.png" alt="Synapse" style={{ height: '24px', objectFit: 'contain' }} />
        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '2px' }}>
          SYNAPSE GTB
        </span>
      </div>
    </div>
  )
}
