import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import CommandPalette from './components/CommandPalette'
import DoctorQuickAuth from './components/auth/DoctorQuickAuth'
import StatusBar from './components/shared/StatusBar'
import ThemeToggle from './components/shared/ThemeToggle'
import SplashScreen from './components/shared/SplashScreen'
import NotificationCenter from './components/chronos/NotificationCenter'
import AmbientParticles from './components/shared/AmbientParticles'
import { ToastProvider } from './components/shared/NotificationToast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { playNavClick, playPaletteOpen } from './utils/sounds'
import { LogOut, Search, Monitor, Shield, LayoutDashboard } from 'lucide-react'
import './styles/index.css'

const ChronosView = lazy(() => import('./pages/ChronosView'))
const SentinelView = lazy(() => import('./pages/SentinelView'))
const ICUCommandCenter = lazy(() => import('./pages/ICUCommandCenter'))
const PatientPortal = lazy(() => import('./pages/PatientPortal'))
const NurseDashboard = lazy(() => import('./pages/NurseDashboard'))

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '2px solid rgba(52, 211, 153, 0.2)',
        borderTopColor: '#34d399',
        animation: 'spin 1s linear infinite',
      }} />
    </div>
  )
}

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, scale: 0.98, y: 12 },
  enter: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -12 },
}

const pageTransition = {
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1],
} as any

// Map route paths to view names for nav highlights
const ROUTE_VIEW_MAP: Record<string, string> = {
  '/': 'chronos',
  '/chronos': 'chronos',
  '/command': 'command',
  '/sentinel': 'sentinel',
}

function AuthenticatedApp() {
  const { isAuthenticated, loading, doctor, logout, session } = useAuth()
  const routerNavigate = useNavigate()
  const location = useLocation()
  const [showPalette, setShowPalette] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [currentRisk, setCurrentRisk] = useState(0.5)

  // Derive active view from current URL path
  const activeView = ROUTE_VIEW_MAP[location.pathname] || 'chronos'

  // Global Cmd+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowPalette(v => {
          if (!v) playPaletteOpen()
          return !v
        })
      }
      if (e.key === 'Escape') setShowPalette(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Navigate using React Router + sound + close palette
  const navigate = useCallback((view: any) => {
    playNavClick()
    const path = view === 'chronos' ? '/' : `/${view}`
    routerNavigate(path)
    setShowPalette(false)
  }, [routerNavigate])

  useEffect(() => {
    (window as any).onNavigateToSentinel = () => navigate('sentinel')
    return () => { delete (window as any).onNavigateToSentinel }
  }, [navigate])

  // Loading state
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-abyss)',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid rgba(52, 211, 153, 0.2)',
          borderTopColor: '#34d399',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Show Quick Auth if not authenticated
  if (!isAuthenticated) {
    return <DoctorQuickAuth />
  }

  // PATIENT VIEW BYPASS
  if (session?.user?.user_metadata?.role === 'patient') {
    return (
      <div style={{ background: 'var(--bg-abyss)', color: 'var(--text-primary)', minHeight: '100vh', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' }}>
        <AmbientParticles riskLevel={0.1} />
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/images/MasterBrandLogo.png" alt="Synapse Logo" style={{ height: '24px' }} />
            <span style={{ fontWeight: 700, letterSpacing: '2px', color: 'var(--text-primary)'}}>SYNAPSE <span style={{ color: 'var(--text-dim)'}}>{`// SECURE PORTAL`}</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <ThemeToggle />
             <button onClick={logout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '10px', background: 'var(--color-critical-bg)', border: '1px solid rgba(255, 45, 85, 0.12)', color: '#ff6b8a', cursor: 'pointer' }}>
               <LogOut size={15} />
             </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
           <PatientPortal />
        </div>
      </div>
    )
  }

  // NURSE VIEW BYPASS
  if (session?.user?.user_metadata?.role === 'nurse') {
    return (
      <div style={{ background: 'var(--bg-abyss)', color: 'var(--text-primary)', minHeight: '100vh', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' }}>
        <AmbientParticles riskLevel={0.2} />
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/images/MasterBrandLogo.png" alt="Synapse Logo" style={{ height: '24px' }} />
            <span style={{ fontWeight: 700, letterSpacing: '2px', color: 'var(--text-primary)'}}>SYNAPSE <span style={{ color: 'var(--text-dim)'}}>{`// NURSE STATION`}</span></span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             {/* Profile display */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                 {doctor?.name?.charAt(0) || 'N'}
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '13px', fontWeight: 600 }}>{doctor?.name || 'Staff Nurse'}</span>
                 <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shift Active</span>
               </div>
             </div>

             <ThemeToggle />
             <button onClick={logout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '10px', background: 'var(--color-critical-bg)', border: '1px solid rgba(255, 45, 85, 0.12)', color: '#ff6b8a', cursor: 'pointer' }}>
               <LogOut size={15} />
             </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
           <NurseDashboard />
        </div>
      </div>
    )
  }

  // Show splash screen on first load after auth
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} userName={doctor?.name} />
  }

  // Main authenticated dashboard
  return (
    <div style={{ 
      background: 'var(--bg-abyss)', 
      color: 'var(--text-primary)', 
      minHeight: '100vh', 
      fontFamily: 'var(--font-display)',
    }}>
      {/* Ambient particles */}
      <AmbientParticles riskLevel={currentRisk} />

      {/* Ambient background */}
      <div className="ambient-bg" />

      {/* Navigation Bar */}
      <nav className="bg-glass-texture" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: '56px',
        borderBottom: '1px solid var(--nav-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/images/MasterBrandLogo.png" alt="Synapse Logo" style={{
            height: '32px',
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.2))',
          }} />
          <span style={{
            fontWeight: 700,
            fontSize: '18px',
            letterSpacing: '-0.3px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
          }}>Synapse GTB</span>
          <span style={{
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--badge-bg)',
            color: 'var(--text-dim)',
            letterSpacing: '1.5px',
          }}>BETA</span>

          {/* Header Nav Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '32px' }}>
            <button
              onClick={() => navigate('chronos')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease',
                background: activeView === 'chronos' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                color: activeView === 'chronos' ? 'var(--color-stable)' : 'var(--text-secondary)',
                border: activeView === 'chronos' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid transparent'
              }}
              onMouseEnter={(e) => { if (activeView !== 'chronos') e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { if (activeView !== 'chronos') e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <Monitor size={14} /> Chronos
            </button>
            <button
              onClick={() => navigate('command')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease',
                background: activeView === 'command' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: activeView === 'command' ? 'var(--color-observing)' : 'var(--text-secondary)',
                border: activeView === 'command' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent'
              }}
              onMouseEnter={(e) => { if (activeView !== 'command') e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { if (activeView !== 'command') e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <LayoutDashboard size={14} /> Command Center
            </button>
            {doctor?.role === 'doctor' && (
              <button
                onClick={() => navigate('sentinel')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  background: activeView === 'sentinel' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                  color: activeView === 'sentinel' ? 'var(--color-critical)' : 'var(--text-secondary)',
                  border: activeView === 'sentinel' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent'
                }}
                onMouseEnter={(e) => { if (activeView !== 'sentinel') e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { if (activeView !== 'sentinel') e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <Shield size={14} /> Sentinel
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Doctor badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-stable-bg)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-stable)',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--color-stable)',
              boxShadow: '0 0 8px rgba(52, 211, 153, 0.6)',
              animation: 'pulse-dot 2s infinite',
            }} />
            {doctor?.name || 'Doctor'}
          </div>

          {/* Search button */}
          <button
            onClick={() => { playPaletteOpen(); setShowPalette(true) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              transition: 'var(--transition-smooth)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <Search size={12} />
            <span>Search</span>
            <kbd style={{
              background: 'var(--kbd-bg)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              border: '1px solid var(--kbd-border)',
              color: 'var(--text-dim)',
            }}>⌘K</kbd>
          </button>

          {/* Notification Center */}
          <NotificationCenter doctorId={doctor?.id} />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Logout button */}
          <button
            id="logout-btn"
            onClick={logout}
            title="Sign Out"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'var(--color-critical-bg)',
              border: '1px solid rgba(255, 45, 85, 0.12)',
              color: '#ff6b8a',
              cursor: 'pointer',
              transition: 'all 300ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 45, 85, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(255, 45, 85, 0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--color-critical-bg)'
              e.currentTarget.style.borderColor = 'rgba(255, 45, 85, 0.12)'
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      {/* Main Content with page transitions */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: '56px',
        paddingLeft: 0,
        paddingBottom: '28px',
        height: '100vh',
        transition: 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                <motion.div
                  key="chronos"
                  variants={pageVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  transition={pageTransition}
                  style={{ height: '100%' }}
                >
                  <ChronosView onRiskChange={setCurrentRisk} />
                </motion.div>
              } />
              <Route path="/chronos" element={<Navigate to="/" replace />} />
              <Route path="/command" element={
                <motion.div
                  key="command"
                  variants={pageVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  transition={pageTransition}
                  style={{ height: '100%' }}
                >
                  <ICUCommandCenter onNavigate={navigate} />
                </motion.div>
              } />
              <Route path="/sentinel" element={
                <motion.div
                  key="sentinel"
                  variants={pageVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  transition={pageTransition}
                  style={{ height: '100%' }}
                >
                  <SentinelView />
                </motion.div>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Command Palette */}
      <AnimatePresence>
        {showPalette && (
          <CommandPalette
            onClose={() => setShowPalette(false)}
            onNavigate={navigate}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AuthenticatedApp />
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
