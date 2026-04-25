import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellRing, X, CheckCheck, AlertTriangle, Clock, Volume2, VolumeX } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { playNotificationRing, playNotificationSilent } from '../../utils/sounds'

export interface Notification {
  notification_id: string;
  patient_id: string;
  message: string;
  type: 'ringing' | 'silent';
  risk_score: number;
  is_read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  doctorId?: string;
}

export default function NotificationCenter({ doctorId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const seenIds = useRef<Set<string>>(new Set())

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      setNotifications(data as Notification[])
      data.forEach((n: Notification) => seenIds.current.add(n.notification_id))
    }
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read).map(n => n.notification_id)
    if (unread.length) {
      await supabase.from('notifications').update({ is_read: true }).in('notification_id', unread)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  // Load initial notifications
  useEffect(() => {
    loadNotifications()
    // Subscribe to new notifications via Supabase realtime
    const channel = supabase
      .channel('notifications_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload: any) => {
        const n = payload.new as Notification
        if (!seenIds.current.has(n.notification_id)) {
          seenIds.current.add(n.notification_id)
          setNotifications(prev => [n, ...prev])
          if (!muted) {
            if (n.type === 'ringing') playNotificationRing()
            else playNotificationSilent()
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [muted, doctorId])

  const unreadCount = notifications.filter(n => !n.is_read).length
  const ringingCount = notifications.filter(n => !n.is_read && n.type === 'ringing').length

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open && ringingCount) playNotificationRing() }}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '34px', height: '34px', borderRadius: '10px',
          background: ringingCount > 0 ? 'var(--color-critical-bg)' : 'var(--glass-bg)',
          border: `1px solid ${ringingCount > 0 ? 'rgba(255, 45, 85, 0.3)' : 'var(--glass-border)'}`,
          color: ringingCount > 0 ? 'var(--color-critical)' : 'var(--text-secondary)',
          cursor: 'pointer', transition: 'all 300ms',
          animation: ringingCount > 0 ? 'pulse-critical 1.5s infinite' : 'none',
        } as any}
      >
        {ringingCount > 0 ? <BellRing size={16} /> : <Bell size={16} />}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            minWidth: '16px', height: '16px', borderRadius: '8px',
            background: 'var(--color-critical)', color: '#fff',
            fontSize: '9px', fontWeight: 800, fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: 'fixed', top: '56px', right: '20px',
              width: '420px', maxHeight: '80vh',
              background: 'var(--glass-bg-solid)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              zIndex: 300, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              backdropFilter: 'blur(24px)',
            } as any}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
                  NOTIFICATIONS
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                  {unreadCount} unread · {ringingCount} critical
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setMuted(!muted)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: muted ? 'var(--color-observing-bg)' : 'transparent',
                  border: '1px solid var(--color-border-subtle)',
                  color: muted ? 'var(--color-observing)' : 'var(--text-dim)',
                  cursor: 'pointer',
                }}>
                  {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
                <button onClick={markAllRead} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '8px',
                  background: 'var(--color-stable-bg)', border: '1px solid rgba(52,211,153,0.2)',
                  color: 'var(--color-stable)', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
                }}>
                  <CheckCheck size={10} /> MARK ALL
                </button>
                <button onClick={() => setOpen(false)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '8px', background: 'transparent',
                  border: '1px solid var(--color-border-subtle)', color: 'var(--text-dim)', cursor: 'pointer',
                }}>
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No notifications yet
                </div>
              ) : notifications.map(n => (
                <NotificationItem key={n.notification_id} notification={n} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  const isRinging = n.type === 'ringing'
  const color = isRinging ? 'var(--color-critical)' : 'var(--color-observing)'

  return (
    <div style={{
      padding: '10px 12px', marginBottom: '4px',
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${!n.is_read ? `${color}33` : 'transparent'}`,
      background: !n.is_read ? `${color}08` : 'transparent',
      position: 'relative', transition: 'var(--transition-fast)',
    } as any}>
      {!n.is_read && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: color, borderRadius: '3px 0 0 3px' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        {isRinging ? <AlertTriangle size={12} color={color} /> : <Clock size={12} color={color} />}
        <span style={{
          fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 700,
          color, letterSpacing: '1px', textTransform: 'uppercase',
          padding: '1px 6px', borderRadius: 'var(--radius-full)',
          background: `${color}15`,
        }}>
          {isRinging ? 'RINGING' : 'SILENT'}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          {n.patient_id} · Risk {n.risk_score}%
        </span>
        {!n.is_read && (
          <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: color }} />
        )}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4', paddingLeft: '20px' }}>
        {n.message}
      </div>
      <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '4px', paddingLeft: '20px' }}>
        {new Date(n.created_at).toLocaleTimeString()}
      </div>
    </div>
  )
}
