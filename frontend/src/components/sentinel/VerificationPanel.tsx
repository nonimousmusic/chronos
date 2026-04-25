/**
 * VerificationPanel.tsx — "Verify Recording Integrity" panel.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Loader2, RefreshCw, Trash2, Edit3, Zap, AlertTriangle } from 'lucide-react';
import { playBreachAlarm, playHashSealed, playCriticalBeep } from '../../utils/sounds';
import { API_BASE } from '../../utils/config';

interface VerificationPanelProps {
  activeSessionId?: string | null
}

export default function VerificationPanel({ activeSessionId = null }: VerificationPanelProps) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'verifying' | 'result' | 'tampering'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tamperResult, setTamperResult] = useState<any>(null);
  const [tamperTarget, setTamperTarget] = useState<number | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  // Auto-select active session when it changes
  useEffect(() => {
    if (activeSessionId) {
      setSelectedSession(activeSessionId);
      fetchRecordings();
    }
  }, [activeSessionId]);

  async function fetchRecordings() {
    setState('loading');
    try {
      const res = await fetch(`${API_BASE}/api/recordings`);
      if (!res.ok) throw new Error('Backend unavailable');
      const data = await res.json();
      setRecordings(data);
      if (!selectedSession && data.length > 0) setSelectedSession(data[0].session_id);
      setError(null);
      setState('idle');
    } catch (e: any) {
      const isServerless = window.location.hostname.includes('vercel.app');
      if (isServerless) {
        setError('Cloud mode — no local recordings. Use Demo Mode or record locally first.');
      } else {
        setError('Backend not running — start with: python -m app.main --with-api');
      }
      setState('idle');
    }
  }

  const runVerification = useCallback(async (sid?: string | null) => {
    const sessionId = sid || selectedSession;
    if (!sessionId) return;
    setState('verifying');
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/verify/${sessionId}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
      setState('result');

      // Play sound based on result
      if (data.ok) {
        playHashSealed();
      } else {
        playBreachAlarm();
        playCriticalBeep();
        if (typeof (window as any).onSentinelTamperDetected === 'function') {
          (window as any).onSentinelTamperDetected({ seq: data.failed_at });
        }
      }
    } catch (e: any) {
      setError(e.message);
      setState('idle');
    }
  }, [selectedSession]);

  async function tamperSession(mode: string, label: string) {
    if (!selectedSession) return;
    
    const recording = recordings.find(r => r.session_id === selectedSession);
    const maxSeq = recording ? recording.records - 1 : 5;
    const targetSeq = Math.max(1, Math.floor(maxSeq / 2));
    
    setTamperTarget(targetSeq);
    setState('tampering');
    setTamperResult(null);
    setResult(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/tamper/${selectedSession}/${targetSeq}?mode=${mode}`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTamperResult({ ...data, label });

      await new Promise(resolve => setTimeout(resolve, 800));
      await runVerification(selectedSession);
    } catch (e: any) {
      setError(`Tamper failed: ${e.message}`);
      setState('idle');
    }
  }

  const selectedRec = recordings.find(r => r.session_id === selectedSession);

  return (
    <div style={styles.container as any}>
      <div style={styles.header as any}>
        <Shield size={18} style={{ color: 'var(--accent)' }} />
        <span style={styles.title as any}>Recording Verification</span>
        <button onClick={fetchRecordings} style={styles.refreshBtn as any} title="Refresh recordings">
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div style={styles.errorBox as any}>
          <ShieldAlert size={14} />
          <span>{error}</span>
        </div>
      )}

      {recordings.length > 0 && (
        <div style={styles.selectorWrap as any}>
          <select
            value={selectedSession || ''}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              setResult(null);
              setTamperResult(null);
            }}
            style={styles.select as any}
          >
            {recordings.map((r) => (
              <option key={r.session_id} value={r.session_id}>
                {r.session_id.slice(0, 8)}... ({r.records} records, {r.batches} batches)
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={() => runVerification()}
        disabled={state === 'verifying' || state === 'tampering' || !selectedSession}
        style={{
          ...(styles.verifyBtn as any),
          opacity: state === 'verifying' || state === 'tampering' || !selectedSession ? 0.5 : 1,
        }}
      >
        {state === 'verifying' ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Verifying Chain...
          </>
        ) : (
          <>
            <ShieldCheck size={16} />
            Verify Recording Integrity
          </>
        )}
      </button>

      {selectedSession && state !== 'verifying' && (
        <div style={styles.tamperSection as any}>
          <div style={styles.tamperHeader as any}>
            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#f59e0b' }}>
              TAMPER SIMULATION
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8 }}>
            Simulate data tampering on seq #{selectedRec ? Math.max(1, Math.floor((selectedRec.records - 1) / 2)) : '?'} to test integrity detection
          </div>
          <div style={styles.tamperBtns as any}>
            <button
              onClick={() => tamperSession('delete_frame', 'Frame Deleted')}
              disabled={state === 'tampering'}
              style={styles.tamperBtn as any}
            >
              <Trash2 size={12} />
              Delete Frame
            </button>
            <button
              onClick={() => tamperSession('modify_vitals', 'Vitals Modified')}
              disabled={state === 'tampering'}
              style={styles.tamperBtn as any}
            >
              <Edit3 size={12} />
              Modify Vitals
            </button>
            <button
              onClick={() => tamperSession('modify_frame', 'Frame Corrupted')}
              disabled={state === 'tampering'}
              style={styles.tamperBtn as any}
            >
              <Zap size={12} />
              Corrupt Frame
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {state === 'tampering' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={styles.tamperingBox as any}
          >
            <Loader2 size={14} className="animate-spin" style={{ color: '#f59e0b' }} />
            <span>Tampering seq #{tamperTarget}... then auto-verifying...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tamperResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={styles.tamperResultBadge as any}
          >
            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
            <span>⚡ {tamperResult.label} at seq #{tamperResult.seq}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state === 'result' && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              ...(styles.resultBox as any),
              borderColor: result.ok ? '#10b981' : '#ef4444',
              background: result.ok
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
            }}
          >
            <div style={styles.resultHeader as any}>
              {result.ok ? (
                <ShieldCheck size={20} style={{ color: '#10b981' }} />
              ) : (
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              )}
              <span style={{ color: result.ok ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                {result.ok
                  ? `INTEGRITY VERIFIED`
                  : `TAMPERING DETECTED`}
              </span>
            </div>

            {result.ok ? (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                All {result.verified_count} records are mathematically cryptolocked and intact.
              </div>
            ) : (
              <div style={styles.mismatchDetails as any}>
                <div style={styles.errorSection as any}>
                  <div style={styles.sectionTitle as any}>[ INCIDENT REPORT ]</div>
                  <div style={styles.detailRow as any}>
                    <span>SEQUENCE:</span>
                    <span style={{ fontWeight: 700, color: '#ff2d55' }}>#{result.failed_at}</span>
                  </div>
                  <div style={styles.detailRow as any}>
                    <span>STATUS:</span>
                    <span style={{ fontWeight: 700, color: '#ff2d55' }}>INTEGRITY BROKEN</span>
                  </div>
                </div>

                <div style={styles.errorSection as any}>
                  <div style={styles.sectionTitle as any}>[ HASH COMPARISON ]</div>
                  <div style={styles.hashRow as any}>
                    <span style={styles.hashLabel as any}>EXPECTED:</span>
                    <code style={styles.hashValue as any} title={result.expected}>
                      {result.expected ? `${result.expected.slice(0, 8)}...${result.expected.slice(-6)}` : 'N/A'}
                    </code>
                  </div>
                  <div style={styles.hashRow as any}>
                    <span style={styles.hashLabel as any}>ACTUAL:</span>
                    <code style={{ ...(styles.hashValue as any), color: '#ef4444' }} title={result.got}>
                      {result.got ? `${result.got.slice(0, 8)}...${result.got.slice(-6)}` : 'N/A'}
                    </code>
                  </div>
                </div>

                <div style={styles.errorSection as any}>
                  <div style={styles.sectionTitle as any}>[ ROOT CAUSE ]</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {result.reason || "Hash mismatch detected. The recorded data payload has been altered after capture."}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  container: { background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', flex: 1 },
  refreshBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' },
  errorBox: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 12 },
  selectorWrap: { display: 'flex', gap: 8 },
  select: { flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace' },
  verifyBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' },
  tamperSection: { borderTop: '1px solid var(--glass-border)', paddingTop: 12 },
  tamperHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  tamperBtns: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  tamperBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.06)', color: '#ef4444', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.2s' },
  tamperingBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: 11, fontFamily: 'var(--font-mono)' },
  tamperResultBadge: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 },
  resultBox: { borderRadius: 8, border: '1px solid', padding: 12 },
  resultHeader: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 },
  mismatchDetails: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12 },
  errorSection: { display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' },
  sectionTitle: { fontSize: '9px', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: '2px' },
  detailRow: { display: 'flex', justifycontent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' },
  hashRow: { display: 'flex', gap: 8, alignItems: 'center' },
  hashLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', width: 60, flexShrink: 0 },
  hashValue: { fontSize: 11, fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' },
};
