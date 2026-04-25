import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, LucideIcon } from 'lucide-react'

export type ToastType = 'info' | 'success' | 'warning' | 'critical';

export interface ToastData {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
}

interface ToastContextType {
  addToast: (options: { type?: ToastType; title?: string; message: string; duration?: number }) => number;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let toastIdCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback(({ type = 'info', title, message, duration = 5000 }: { type?: ToastType; title?: string; message: string; duration?: number }) => {
    const id = ++toastIdCounter
    setToasts(prev => [...prev, { id, type, title, message, duration }])
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
    return id
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[], onDismiss: (id: number) => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: '72px',
      right: '16px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '380px',
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ToastStyle {
  icon: LucideIcon;
  accentColor: string;
  bg: string;
  border: string;
}

const TOAST_STYLES: Record<ToastType, ToastStyle> = {
  critical: {
    icon: AlertTriangle,
    accentColor: 'var(--color-critical)',
    bg: 'var(--color-critical-bg)',
    border: 'rgba(255, 45, 85, 0.2)',
  },
  success: {
    icon: CheckCircle2,
    accentColor: 'var(--color-stable)',
    bg: 'var(--color-stable-bg)',
    border: 'rgba(52, 211, 153, 0.2)',
  },
  warning: {
    icon: AlertTriangle,
    accentColor: 'var(--color-observing)',
    bg: 'var(--color-observing-bg)',
    border: 'rgba(251, 191, 36, 0.2)',
  },
  info: {
    icon: Info,
    accentColor: 'var(--accent-cyan)',
    bg: 'rgba(100, 210, 255, 0.06)',
    border: 'rgba(100, 210, 255, 0.15)',
  },
}

function Toast({ toast, onDismiss }: { toast: ToastData, onDismiss: () => void }) {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info
  const Icon = style.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--toast-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${style.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '3px',
        background: style.accentColor,
      }} />

      <div style={{
        marginTop: '2px',
        flexShrink: 0,
      }}>
        <Icon size={18} color={style.accentColor} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '3px',
          }}>{toast.title}</div>
        )}
        <div style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.4,
        }}>{toast.message}</div>
      </div>

      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          padding: '2px',
          flexShrink: 0,
          borderRadius: '4px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: toast.duration / 1000, ease: 'linear' }}
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: style.accentColor,
                transformOrigin: 'left',
                opacity: 0.5,
            } as any}
        />
      )}
    </motion.div>
  )
}
