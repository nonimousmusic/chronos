import React, { useMemo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  GitBranch, Link2, Cpu, AlertTriangle, 
  Activity, Clock, HardDrive, Layers
} from 'lucide-react'
import { API_BASE } from '@/utils/config'

// --- HASH METRICS (Memoized) ---
interface HashMetricsProps {
  liveMode?: boolean
  idleMode?: boolean
  liveSeq?: number
  liveElapsed?: number
  liveLatestHash?: string
  liveBatchCount?: number
}

export const HashMetrics = React.memo(({
  liveMode = false,
  idleMode = false,
  liveSeq = 0,
  liveElapsed = 0,
  liveBatchCount = 0,
}: HashMetricsProps) => {
  const [metrics, setMetrics] = useState({
    hashPerSec: '0.0',
    latencyMs: '0',
    chainLength: 0,
    merkleBatches: 0,
    running: false,
  });

  useEffect(() => {
    if (liveMode || idleMode) return;
    let interval: ReturnType<typeof setInterval>;
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
            hashPerSec: dt > 0 ? (dSeq / dt).toFixed(1) : '0.0',
            latencyMs: latency.toFixed(0),
            chainLength: data.seq,
            merkleBatches: data.batches,
            running: data.running,
          });
          lastSeq = data.seq;
          lastTime = now;
        }
      } catch {}
    }

    poll();
    interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [liveMode, idleMode]);

  const display = idleMode ? {
    hashPerSec: '0.0', latencyMs: '—', chainLength: 'STANDBY', merkleBatches: '0', running: false,
  } : (liveMode ? {
    hashPerSec: liveElapsed > 0 ? (liveSeq / liveElapsed).toFixed(1) : '0',
    latencyMs: '—', chainLength: liveSeq, merkleBatches: liveBatchCount, running: true,
  } : metrics);

  const items = [
    { icon: <Activity size={14} />, label: 'Hash/sec', value: display.hashPerSec, color: '#10b981' },
    { icon: <Clock size={14} />, label: liveMode ? 'Elapsed' : 'Latency', value: liveMode ? `${Math.floor(liveElapsed)}s` : `${display.latencyMs}ms`, color: '#6366f1' },
    { icon: <Link2 size={14} />, label: 'Chain', value: display.chainLength, color: '#f59e0b' },
    { icon: <Layers size={14} />, label: 'Batches', value: display.merkleBatches, color: '#8b5cf6' },
    { icon: <HardDrive size={14} />, label: 'Storage', value: display.running ? 'Recording' : 'Idle', color: display.running ? '#10b981' : '#6b7280' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {items.map((item, i) => (
        <motion.div key={i} className="flex items-center gap-2 p-2 px-3 rounded-xl bg-white/[0.03] border border-white/5 flex-1 min-w-[100px]">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5" style={{ color: item.color }}>
            {item.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold font-mono leading-tight">{item.value}</span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">{item.label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
})

// --- HASH MATRIX (Memoized) ---
interface HashMatrixProps {
  auditTrail: any[]
  currentIdx: number
  tamperActive: boolean
  finalHash?: string | null
  liveMode?: boolean
}

export const HashMatrix = React.memo(({ auditTrail, currentIdx, tamperActive, liveMode = false }: HashMatrixProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      if (liveMode) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      else scrollRef.current.scrollTop = 0
    }
  }, [currentIdx, liveMode, auditTrail.length])

  const visibleHashes = useMemo(() => {
    return auditTrail.slice(Math.max(0, currentIdx - 30), currentIdx + 1).reverse()
  }, [auditTrail, currentIdx])

  const selectedEntry = visibleHashes[0] || null

  return (
    <div className="glass flex flex-col flex-[0_0_auto] max-h-[45%] overflow-hidden rounded-[20px]">
      <div className="p-[14px_16px_10px] border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div>
          <header className="text-[9px] text-zinc-500 font-mono tracking-widest font-bold uppercase">
            CRYPTOGRAPHIC TRAIL
          </header>
          <div className="text-[14px] font-bold text-white mt-0.5">Live Hash Matrix</div>
        </div>
        <div className={`font-mono text-[9px] font-black px-2 py-1 rounded-md border ${
          tamperActive ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
        }`}>
          {tamperActive ? '✗ BROKEN' : '✓ CHAINED'}
        </div>
      </div>

      <div className="m-[8px_14px_0] p-[6px_10px] bg-indigo-500/5 border border-indigo-500/10 rounded-md font-mono text-[8px] text-indigo-300 tracking-tight">
        H[n] = SHA256(canonical_json(&#123;seq, ts, frame_sha256, vitals, prev_hash&#125;))
      </div>

      {selectedEntry && (
        <div className="m-[8px_14px_0] p-[8px_10px] bg-white/[0.02] border border-white/5 rounded-md space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono font-black text-zinc-500 w-10 shrink-0">PREV</span>
            <span className="text-[8px] font-mono text-zinc-400 truncate">
              {selectedEntry.prev_hash ? selectedEntry.prev_hash : '0'.repeat(64)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-mono font-black w-10 shrink-0 ${tamperActive ? 'text-red-500' : 'text-emerald-500'}`}>CURR</span>
            <span className={`text-[8px] font-mono truncate ${tamperActive ? 'text-red-400' : 'text-zinc-200'}`}>
              {selectedEntry.data_hash || selectedEntry.chain_hash || 'N/A'}
            </span>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-[8px_14px] scrollbar-hide opacity-80" style={{ maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }}>
        {visibleHashes.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className={`font-mono text-[9px] leading-relaxed transition-all duration-300 ${
              tamperActive && i % 3 === 0 ? 'text-red-500 line-through' : (i === 0 ? 'text-emerald-400' : 'text-zinc-600')
            }`}
          >
            {(entry.data_hash || entry.chain_hash || 'NULL').slice(0, 24)}...
          </div>
        ))}
      </div>
    </div>
  )
})

// --- MERKLE TREE VIZ (Memoized) ---
interface MerkleTreeVizProps {
  auditTrail: any[]
  batches?: any[]
  tamperActive?: boolean
  tamperSeq?: number | null
}

export const MerkleTreeViz = React.memo(({ auditTrail = [], batches = [], tamperActive = false, tamperSeq = null }: MerkleTreeVizProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const leaves = useMemo(() => auditTrail.slice(-8).map(r => ({
    hash: r.chain_hash || r.data_hash || '00000000',
    seq: r.seq ?? r.frame_idx
  })), [auditTrail]);

    const treeData = useMemo(() => {
      if (leaves.length === 0) return { levels: [] as any[][], lines: [] as any[] };
      const levels: any[][] = [[...leaves.map((l, i) => ({ 
        hash: l.hash, id: `L0-${i}`, level: 0, idx: i, seq: l.seq,
        short: l.hash.slice(0, 4) + '..' + l.hash.slice(-4),
        isCorrupted: tamperActive && l.seq === tamperSeq
      }))]];
      let current = levels[0];
      while (current.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < current.length; i += 2) {
          const left = current[i];
          const right = i + 1 < current.length ? current[i + 1] : left;
          const parentHash = (left.hash.slice(0, 4) + right.hash.slice(0, 4)).padEnd(8, '0');
          nextLevel.push({
            hash: parentHash, id: `L${levels.length}-${nextLevel.length}`, 
            level: levels.length, idx: nextLevel.length,
            seq: left.seq,
            short: parentHash.slice(0, 4) + '..' + parentHash.slice(-4),
            isCorrupted: left.isCorrupted || right.isCorrupted,
            children: [left.id, right.id]
          });
        }
        levels.push(nextLevel);
        current = nextLevel;
      }
    const lines: any[] = [];
    levels.forEach((level, li) => {
      if (li === 0) return;
      level.forEach(node => node.children?.forEach((childId: string) => {
        lines.push({ from: childId, to: node.id, isCorrupted: node.isCorrupted });
      }));
    });
    return { levels, lines };
  }, [leaves, tamperActive, tamperSeq]);

  const getPos = (level: number, idx: number, totalInLevel: number) => {
    const height = 180, width = 300;
    const y = height - (level * 45) - 20;
    const x = (width / (totalInLevel + 1)) * (idx + 1);
    return { x, y };
  };

  return (
    <div className="glass p-5 rounded-[24px] flex flex-col gap-5 border border-white/5">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tamperActive ? 'bg-red-500/10' : 'bg-cyan-500/10'}`}>
          {tamperActive ? <AlertTriangle size={14} className="text-red-500" /> : <GitBranch size={14} className="text-cyan-400" />}
        </div>
        <div className="flex-1">
          <div className={`text-[13px] font-bold ${tamperActive ? 'text-red-500' : 'text-white'}`}>
            {tamperActive ? 'TAMPERED INTEGRITY TREE' : 'Merkle Integrity Tree'}
          </div>
          <div className="text-[9px] text-zinc-500 font-mono tracking-wider font-bold">DETERMINISTIC AGGREGATION</div>
        </div>
        {batches.length > 0 && (
          <div className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded flex items-center gap-1.5">
            <Cpu size={10} /> BATCH #{batches.length}
          </div>
        )}
      </div>

      <div className="relative h-[180px] flex items-center justify-center">
        <svg width="300" height="180" viewBox="0 0 300 180" className="overflow-visible">
          {treeData.lines.map((line, i) => {
            const flat = treeData.levels.flat();
            const fromNode = flat.find(n => n.id === line.from);
            const toNode = flat.find(n => n.id === line.to);
            if (!fromNode || !toNode) return null;
            
            const fromPos = getPos(fromNode.level, fromNode.idx, treeData.levels[fromNode.level].length);
            const toPos = getPos(toNode.level, toNode.idx, treeData.levels[toNode.level].length);
            return (
              <motion.path key={i} d={`M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`} 
                stroke={line.isCorrupted ? '#ff2d55' : 'rgba(255,255,255,0.1)'} strokeWidth={line.isCorrupted ? 2 : 1} fill="none"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
            );
          })}
          {treeData.levels.flat().map((node) => {
            const pos = getPos(node.level, node.idx, treeData.levels[node.level].length);
            return (
              <motion.g key={node.id} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)} className="cursor-pointer">
                <circle cx={pos.x} cy={pos.y} r="3" fill={node.isCorrupted ? '#ff2d55' : (node.level === treeData.levels.length - 1 ? '#10b981' : '#6366f1')} />
                <motion.rect x={pos.x - 22} y={pos.y - 8} width="44" height="16" rx="4" 
                  fill={node.isCorrupted ? 'rgba(255,45,85,0.2)' : (hoveredNode === node.id ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.4)')} 
                  stroke={node.isCorrupted ? '#ff2d55' : (hoveredNode === node.id ? '#22d3ee' : 'rgba(255,255,255,0.1)')} />
                <text x={pos.x} y={pos.y + 3} textAnchor="middle" className="text-[7px] font-mono font-bold" fill={node.isCorrupted ? '#ff2d55' : '#fff'}>{node.short}</text>
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  )
})
