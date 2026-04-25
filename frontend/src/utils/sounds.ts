// Programmatic sound effects using Web Audio API
// No external audio files needed — generates sounds on the fly

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx!;
}

// ── Security Breach Alarm ──
// Harsh descending siren + static burst
export function playBreachAlarm(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  // Siren oscillator (descending tone)
  const siren = ctx.createOscillator();
  const sirenGain = ctx.createGain();
  siren.type = 'sawtooth';
  siren.frequency.setValueAtTime(880, now);
  siren.frequency.exponentialRampToValueAtTime(220, now + 0.4);
  siren.frequency.exponentialRampToValueAtTime(660, now + 0.6);
  siren.frequency.exponentialRampToValueAtTime(110, now + 1.0);
  sirenGain.gain.setValueAtTime(0.15, now);
  sirenGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
  siren.connect(sirenGain).connect(ctx.destination);
  siren.start(now);
  siren.stop(now + 1.2);

  // Static/noise burst
  const bufferSize = ctx.sampleRate * 0.3;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = noiseBuffer;
  noiseGain.gain.setValueAtTime(0.12, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  noise.connect(noiseGain).connect(ctx.destination);
  noise.start(now + 0.1);

  // Second siren hit
  const siren2 = ctx.createOscillator();
  const siren2Gain = ctx.createGain();
  siren2.type = 'square';
  siren2.frequency.setValueAtTime(440, now + 1.0);
  siren2.frequency.exponentialRampToValueAtTime(110, now + 1.8);
  siren2Gain.gain.setValueAtTime(0.08, now + 1.0);
  siren2Gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
  siren2.connect(siren2Gain).connect(ctx.destination);
  siren2.start(now + 1.0);
  siren2.stop(now + 2.0);
}

// ── Critical Alert Beep ──
// Two short high-pitched beeps (like a hospital monitor alarm)
export function playCriticalBeep(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.1, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.1);
  }
}

// ── Anomaly Detection Ping ──
// Soft metallic ping (like sonar)
export function playAnomalyPing(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

// ── Hash Sealed Confirmation ──
// Satisfying ascending chime
export function playHashSealed(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const freqs = [523, 659, 784]; // C5, E5, G5 chord
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.04, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.5);
  });
}

// ── Navigation Click ──
// Subtle soft click
export function playNavClick(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 600;
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

// ── Command Palette Open ──
// Soft whoosh
export function playPaletteOpen(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

// ── Notification Ring (On-Duty) ──
// Loud, repeating hospital alarm — 3 ascending tones
export function playNotificationRing(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const tones = [
    { freq: 880, start: 0, dur: 0.12 },
    { freq: 1100, start: 0.15, dur: 0.12 },
    { freq: 1320, start: 0.30, dur: 0.15 },
    // repeat
    { freq: 880, start: 0.55, dur: 0.12 },
    { freq: 1100, start: 0.70, dur: 0.12 },
    { freq: 1320, start: 0.85, dur: 0.15 },
  ];

  tones.forEach(t => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = t.freq;
    gain.gain.setValueAtTime(0.18, now + t.start);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t.start + t.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + t.start);
    osc.stop(now + t.start + t.dur + 0.05);
  });
}

// ── Notification Silent (Off-Duty) ──
// Soft single ping
export function playNotificationSilent(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(680, now);
  osc.frequency.exponentialRampToValueAtTime(520, now + 0.2);
  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

// ── Success Chime ──
// Bright single beep
export function playSuccess(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

// ── Notification Ping ──
// Friendly dual tone
export function playNotification(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const tones = [
    { f: 660, t: 0, d: 0.1 },
    { f: 880, t: 0.1, d: 0.15 }
  ];

  tones.forEach(tone => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = tone.f;
    gain.gain.setValueAtTime(0.05, now + tone.t);
    gain.gain.exponentialRampToValueAtTime(0.001, now + tone.t + tone.d);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + tone.t);
    osc.stop(now + tone.t + tone.d);
  });
}
