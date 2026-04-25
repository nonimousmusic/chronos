import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Link2, Layers, HardDrive } from 'lucide-react';
import { API_BASE } from '../../utils/config';

interface HashMetricsProps {
  liveMode?: boolean;
  idleMode?: boolean;
  liveSeq?: number;
  liveElapsed?: number;
  liveLatestHash?: string;
  liveBatchCount?: number;
}

interface MetricsState {
  hashPerSec: string | number;
  latencyMs: string | number;
  chainLength: number | string;
  merkleBatches: number;
  running: boolean;
}

export default function HashMetrics({
  liveMode = false,
  idleMode = false,
  liveSeq = 0,
  liveElapsed = 0,
  // liveLatestHash = '',
  liveBatchCount = 0,
}: HashMetricsProps) {
  const [metrics, setMetrics] = useState<MetricsState>({
    hashPerSec: 0,
    latencyMs: 0,
    chainLength: 0,
    merkleBatches: 0,
    running: false,
  });

  // Polling for review mode
  useEffect(() => {
    if (liveMode || idleMode) return;

    let lastSeq = 0;
    let lastTime = Date.now();

    async function poll() {
      try {
        const t0 = performance.now();
        const res = await fetch(`${API_BASE}/api/status`);
        const latency = performance.now() - t0;

        if (res.ok) {
          const data = await res.json();
          const now = Date.now();
          const dt = (now - lastTime) / 1000;
          const dSeq = data.seq - lastSeq;

          setMetrics({
            hashPerSec: dt > 0 ? (dSeq / dt).toFixed(1) : 0,
            latencyMs: latency.toFixed(0),
            chainLength: data.seq,
            merkleBatches: data.batches,
            running: data.running,
          });

          lastSeq = data.seq;
          lastTime = now;
        }
      } catch {
        // Backend not running
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [liveMode, idleMode]);

  // Compute live metrics
  const displayMetrics: MetricsState = idleMode ? {
    hashPerSec: '0.0',
    latencyMs: '—',
    chainLength: 'STANDBY',
    merkleBatches: 0,
    running: false,
  } : (liveMode ? {
    hashPerSec: liveElapsed > 0 ? (liveSeq / liveElapsed).toFixed(1) : '0',
    latencyMs: '—',
    chainLength: liveSeq,
    merkleBatches: liveBatchCount,
    running: true,
  } : metrics);

  const items = [
    {
      icon: <Activity size={14} />,
      label: 'Hash/sec',
      value: displayMetrics.hashPerSec,
      color: '#10b981',
    },
    {
      icon: <Clock size={14} />,
      label: liveMode ? 'Elapsed' : 'Latency',
      value: liveMode ? `${Math.floor(liveElapsed)}s` : `${displayMetrics.latencyMs}ms`,
      color: '#6366f1',
    },
    {
      icon: <Link2 size={14} />,
      label: 'Chain',
      value: displayMetrics.chainLength,
      color: '#f59e0b',
    },
    {
      icon: <Layers size={14} />,
      label: 'Batches',
      value: displayMetrics.merkleBatches,
      color: '#8b5cf6',
    },
    {
      icon: <HardDrive size={14} />,
      label: 'Storage',
      value: displayMetrics.running ? 'Recording' : 'Idle',
      color: displayMetrics.running ? '#10b981' : '#6b7280',
    },
  ];

  return (
    <div style={styles.container as any}>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          style={styles.metricCard as any}
        >
          <div style={{ ...styles.iconWrap, color: item.color } as any}>
            {item.icon}
          </div>
          <div style={styles.metricBody as any}>
            <span style={styles.metricValue as any}>{item.value}</span>
            <span style={styles.metricLabel as any}>{item.label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  metricCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 10,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    flex: '1 1 auto',
    minWidth: 100,
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 7,
    background: 'var(--bg-secondary)',
    flexShrink: 0,
  },
  metricBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    fontFamily: 'monospace',
  },
  metricLabel: {
    fontSize: 10,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};
