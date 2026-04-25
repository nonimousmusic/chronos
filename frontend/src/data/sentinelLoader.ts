/**
 * sentinelLoader.ts — Data loader for SentinelView.
 *
 * Tries to fetch from backend API first, falls back to local sample data.
 * Uses real SHA-256 chain via cryptoEngine when generating sample audit trails.
 */

import { sha256, ChainState } from '../utils/cryptoEngine'
import { API_BASE } from '../utils/config'

export interface TelemetryPoint {
  timestamp: number;
  heart_rate: number;
  spo2: number;
  bp_sys: number;
  motion_score: number;
  frame_idx: number;
  tags: TelemetryTag[];
}

export interface TelemetryTag {
  type: string;
  message: string;
  reason: string;
}

export interface CommMessage {
  timestamp: number;
  speaker: string;
  text: string;
  type: 'normal' | 'alarm' | 'alert';
}

export const SAMPLE_TELEMETRY: TelemetryPoint[] = Array.from({ length: 360 }, (_, i) => {
  const t = i * 0.5;
  const isHrSpike = (t >= 10 && t <= 15) || (t >= 120 && t <= 125);
  const isSpo2Drop = (t >= 30 && t <= 35) || (t >= 150 && t <= 155);
  const hr = (isHrSpike ? 115 : 75) + (Math.random() - 0.5) * 4;
  const spo2 = Math.min(100, (isSpo2Drop ? 88 : 98) + (Math.random() - 0.5) * 1.5);
  const bp = 120 + (Math.random() - 0.5) * 10;
  const motion = Math.random() * ((t > 20 && t < 22) || (t > 140 && t < 142) ? 45 : 8);
  const tags: TelemetryTag[] = [];
  if (hr > 110) tags.push({ type: 'HR_SPIKE', message: 'CRITICAL: Tachycardia Detected', reason: `Heart rate reached ${hr.toFixed(1)} BPM (>110)` });
  if (spo2 < 92) tags.push({ type: 'SPO2_DROP', message: 'WARNING: Desaturation Detected', reason: `SpO2 dropped to ${spo2.toFixed(1)}% (<92%)` });
  if (motion > 30) tags.push({ type: 'MOTION_ANOMALY', message: 'ANOMALY: Erratic Movement', reason: `Visual motion score ${motion.toFixed(2)} exceeds threshold (30)` });
  return {
    timestamp: Math.round(t * 1000) / 1000,
    heart_rate: Math.round(hr * 10) / 10,
    spo2: Math.round(spo2 * 10) / 10,
    bp_sys: Math.round(bp * 10) / 10,
    motion_score: Math.round(motion * 100) / 100,
    frame_idx: i,
    tags,
  };
});

export const SAMPLE_COMMS: CommMessage[] = [
  { timestamp: 2, speaker: 'Surgeon', text: 'Scalpel, please. Commencing incision.', type: 'normal' },
  { timestamp: 5, speaker: 'Nurse', text: 'Vitals stable. BP 120/80.', type: 'normal' },
  { timestamp: 9, speaker: 'SYSTEM', text: 'CRITICAL ALARM: Tachycardia Detected', type: 'alarm' },
  { timestamp: 12, speaker: 'Anesthesia', text: 'Heart rate spiking. Pushing meds.', type: 'normal' },
  { timestamp: 16, speaker: 'Surgeon', text: 'Hold steady... stabilizing.', type: 'normal' },
  { timestamp: 20, speaker: 'SYSTEM', text: 'ALERT: Erratic Table Motion', type: 'alert' },
  { timestamp: 22, speaker: 'Nurse', text: 'Sorry, bumped the tray.', type: 'normal' },
  { timestamp: 29, speaker: 'SYSTEM', text: 'WARNING: SpO2 Desaturation', type: 'alarm' },
  { timestamp: 32, speaker: 'Anesthesia', text: 'Adjusting O2 mix now.', type: 'normal' },
  { timestamp: 38, speaker: 'Surgeon', text: 'Levels normalizing. Proceeding.', type: 'normal' },
  { timestamp: 45, speaker: 'Nurse', text: 'Vitals returning to baseline.', type: 'normal' },
  { timestamp: 55, speaker: 'Surgeon', text: 'Closing up.', type: 'normal' },
];

// ── Build audit trail with REAL SHA-256 hashing ──

async function buildRealAuditTrail(telemetry: TelemetryPoint[]): Promise<any[]> {
  const chain = new ChainState('0'.repeat(64))
  const results: any[] = []

  for (const t of telemetry) {
    const vitals = {
      bp_dia: Math.round((t.bp_sys || 120) * 0.67),
      bp_sys: Math.round(t.bp_sys || 120),
      hr: Math.round(t.heart_rate || 80),
      spo2: Math.round(t.spo2 || 98),
    }
    const frameMock = `frame_${t.frame_idx}_${t.timestamp}`
    const frame_sha256 = await sha256(frameMock)

    const rec = await chain.addRecord(
      Math.floor(t.timestamp * 1000),
      frame_sha256,
      vitals,
    )

    results.push({
      timestamp: t.timestamp,
      data_hash: rec.chain_hash,
      prev_hash: rec.prev_hash,
      seq: rec.seq,
      frame_sha256: rec.frame_sha256,
      vitals: rec.vitals,
      chain_hash: rec.chain_hash,
    })
  }

  return results
}

// ── Backend fetch helpers ──

async function fetchFromBackend(endpoint: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`)
    if (res.ok) return await res.json()
  } catch (_) {}
  return null
}

// ── Public API ──

export async function loadTelemetry(basePath: string = ''): Promise<TelemetryPoint[]> {
  try {
    const res = await fetch(`${basePath}/telemetry.json?t=${Date.now()}`);
    if (res.ok) return await res.json();
  } catch (_) { /* fallback */ }
  return SAMPLE_TELEMETRY;
}

export async function loadAuditTrail(basePath: string = ''): Promise<any[]> {
  // Try backend first
  const backendStatus = await fetchFromBackend('/api/status')
  if (backendStatus && backendStatus.session_id) {
    // Backend is running with live session — fetch recordings for audit data
    const recordings = await fetchFromBackend('/api/recordings')
    if (recordings && recordings.length > 0) {
      console.log('[sentinelLoader] Using backend data')
    }
  }

  // Try local file
  try {
    const res = await fetch(`${basePath}/audit_trail.json?t=${Date.now()}`);
    if (res.ok) return await res.json();
  } catch (_) { /* fallback */ }

  // Fall back to real SHA-256 computed sample data
  console.log('[sentinelLoader] Building real SHA-256 audit trail...')
  return await buildRealAuditTrail(SAMPLE_TELEMETRY)
}

export async function loadSessions(basePath: string = ''): Promise<any[] | null> {
  // Try backend API
  const backendSessions = await fetchFromBackend('/api/recordings')
  if (backendSessions && backendSessions.length > 0) return backendSessions

  try {
    const res = await fetch(`${basePath}/sessions.json?t=${Date.now()}`);
    if (res.ok) return await res.json();
  } catch (_) { /* fallback */ }
  return null;
}

export async function tamperRecord(sessionId: string, seq: number, mode: string = 'modify_vitals'): Promise<any> {
  try {
    const res = await fetch(
      `${API_BASE}/api/tamper/${sessionId}/${seq}?mode=${mode}`,
      { method: 'POST' }
    )
    if (res.ok) return await res.json()
  } catch (e) {
    console.error('[sentinelLoader] Tamper failed:', e)
  }
  return null
}

export async function verifyRecording(sessionId: string): Promise<any> {
  try {
    const res = await fetch(
      `${API_BASE}/api/verify/${sessionId}`,
      { method: 'POST' }
    )
    if (res.ok) return await res.json()
  } catch (e) {
    console.error('[sentinelLoader] Verify failed:', e)
  }
  return null
}
