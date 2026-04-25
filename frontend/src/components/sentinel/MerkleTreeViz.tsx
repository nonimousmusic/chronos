import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Link2, Database, ShieldCheck, Cpu, AlertTriangle } from 'lucide-react';

interface AuditTrailItem {
  chain_hash?: string;
  hash?: string;
  seq?: number;
  frame_idx?: number;
  [key: string]: any;
}

interface Batch {
  tx_hash?: string;
  [key: string]: any;
}

interface MerkleNode {
  hash: string;
  id: string;
  level: number;
  idx: number;
  seq?: number;
  short: string;
  isCorrupted: boolean | null;
  children?: string[];
}

interface MerkleTreeVizProps {
  auditTrail?: AuditTrailItem[];
  batches?: Batch[];
  tamperActive?: boolean;
  tamperSeq?: number | null;
}

interface TreeData {
  levels: MerkleNode[][];
  lines: { from: string; to: string; isCorrupted: boolean | null | undefined }[];
  corruptedNodeIds: Set<string>;
}

export default function MerkleTreeViz({ 
  auditTrail = [], 
  batches = [], 
  tamperActive = false, 
  tamperSeq = null 
}: MerkleTreeVizProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Take the last 8 hashes for the viz
  const leaves = useMemo(() => {
    return auditTrail.slice(-8).map(r => ({
      hash: r.chain_hash || r.hash || '00000000',
      seq: r.seq || r.frame_idx
    }));
  }, [auditTrail]);

  // Build the tree nodes and levels
  const treeData = useMemo<TreeData>(() => {
    if (leaves.length === 0) return { levels: [], lines: [], corruptedNodeIds: new Set() };

    const levels: MerkleNode[][] = [leaves.map((l, i) => ({ 
      hash: l.hash, 
      id: `L0-${i}`, 
      level: 0, 
      idx: i,
      seq: l.seq,
      short: l.hash.slice(0, 4) + '..' + l.hash.slice(-4),
      isCorrupted: tamperActive && l.seq === tamperSeq
    }))];

    // Build levels up to the root
    let current = levels[0];
    while (current.length > 1) {
      const nextLevel: MerkleNode[] = [];
      const currentLevelIdx = levels.length;
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : left;
        const parentHash = (left.hash.slice(0, 4) + right.hash.slice(0, 4)).padEnd(8, '0');
        const isCorrupted = left.isCorrupted || right.isCorrupted;
        
        nextLevel.push({
          hash: parentHash,
          id: `L${currentLevelIdx}-${nextLevel.length}`,
          level: currentLevelIdx,
          idx: nextLevel.length,
          short: parentHash.slice(0, 4) + '..' + parentHash.slice(-4),
          isCorrupted,
          children: [left.id, right.id]
        });
      }
      levels.push(nextLevel);
      current = nextLevel;
    }

    // Generate line data (connections)
    const lines: { from: string; to: string; isCorrupted: boolean | null | undefined }[] = [];
    const corruptedNodeIds = new Set<string>();
    levels.forEach((level, li) => {
      level.forEach((node) => {
        if (node.isCorrupted) corruptedNodeIds.add(node.id);
        if (li === 0) return;
        node.children?.forEach(childId => {
          lines.push({ from: childId, to: node.id, isCorrupted: node.isCorrupted });
        });
      });
    });

    return { levels, lines, corruptedNodeIds };
  }, [leaves, tamperActive, tamperSeq]);

  const latestBatch = batches[batches.length - 1];
  const anchorStatus = latestBatch ? 'Anchored' : 'Awaiting Batch...';
  const anchorColor = tamperActive ? 'var(--color-critical)' : (latestBatch ? 'var(--color-stable)' : 'var(--accent-amber)');

  const getPos = (level: number, idx: number, totalInLevel: number) => {
    const height = 180;
    const width = 300;
    const y = height - (level * 45) - 20;
    const x = (width / (totalInLevel + 1)) * (idx + 1);
    return { x, y };
  };

  // const formatHash = (h: string) => `${h.slice(0, 8)}...${h.slice(-6)}`;

  return (
    <div className="glass" style={styles.container as any}>
      <div style={styles.header as any}>
        <div style={{ ...styles.headerIcon, background: tamperActive ? 'var(--color-critical-bg)' : 'rgba(100, 210, 255, 0.1)' } as any}>
          {tamperActive ? <AlertTriangle size={14} color="var(--color-critical)" /> : <GitBranch size={14} color="var(--accent-cyan)" />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...styles.title, color: tamperActive ? 'var(--color-critical)' : 'var(--text-primary)' } as any}>
            {tamperActive ? 'TAMPERED INTEGRITY TREE' : 'Merkle Integrity Tree'}
          </div>
          <div style={styles.subtitle as any}>Deterministic Data Aggregation</div>
        </div>
        {latestBatch && (
          <div style={styles.batchBadge as any}>
            <Cpu size={10} /> BATCH #{batches.length}
          </div>
        )}
      </div>

      <div style={styles.vizArea as any}>
        <div style={styles.layers as any}>
          <span style={styles.layerLabel as any}>MERKLE ROOT</span>
          <span style={styles.layerLabel as any}>INTERMEDIATE</span>
          <span style={styles.layerLabel as any}>DATA LEAVES</span>
        </div>

        <svg width="300" height="180" viewBox="0 0 300 180" style={{ overflow: 'visible' }}>
          <AnimatePresence>
            {/* Lines */}
            {treeData.lines.map((line, i) => {
              const fromNode = treeData.levels.flat().find(n => n.id === line.from)!;
              const toNode = treeData.levels.flat().find(n => n.id === line.to)!;
              const fromPos = getPos(fromNode.level, fromNode.idx, treeData.levels[fromNode.level].length);
              const toPos = getPos(toNode.level, toNode.idx, treeData.levels[toNode.level].length);
              
              const isHighlighted = hoveredNode && (hoveredNode === fromNode.id || hoveredNode === toNode.id);
              const isCorrupted = fromNode.isCorrupted && toNode.isCorrupted;

              return (
                <motion.path
                  key={`line-${i}-${isCorrupted}`}
                  d={`M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`}
                  stroke={isCorrupted ? 'var(--color-critical)' : (isHighlighted ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)')}
                  strokeWidth={isCorrupted || isHighlighted ? 2 : 1}
                  strokeOpacity={isCorrupted ? 0.8 : 1}
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                />
              );
            })}

            {/* Dynamic Flow Dots (Hidden if corrupted to focus on error) */}
            {!tamperActive && auditTrail.length > 0 && treeData.lines.map((line, i) => {
               const fromNode = treeData.levels.flat().find(n => n.id === line.from)!;
               const toNode = treeData.levels.flat().find(n => n.id === line.to)!;
               const fromPos = getPos(fromNode.level, fromNode.idx, treeData.levels[fromNode.level].length);
               const toPos = getPos(toNode.level, toNode.idx, treeData.levels[toNode.level].length);
               return (
                 <motion.circle
                   key={`dot-${i}`}
                   r="1"
                   fill="var(--accent-cyan)"
                   initial={{ offsetDistance: "0%" }}
                   animate={{ offsetDistance: "100%" }}
                   style={{ offsetPath: `path('M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}')` } as any}
                   transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: i * 0.1 }}
                 />
               );
            })}

            {/* Nodes */}
            {treeData.levels.flat().map((node) => {
              const pos = getPos(node.level, node.idx, treeData.levels[node.level].length);
              const isRoot = node.level === treeData.levels.length - 1;
              const isLeaf = node.level === 0;
              const isCorrupted = node.isCorrupted;
              
              return (
                <motion.g
                  key={`${node.id}-${isCorrupted}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={pos.x} cy={pos.y} r="3.5"
                    fill={isCorrupted ? 'var(--color-critical)' : (isRoot ? 'var(--color-stable)' : (isLeaf ? 'var(--accent-blue)' : 'var(--accent-purple)'))}
                    stroke={isCorrupted ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}
                    strokeWidth="1"
                  />
                  <motion.rect
                    x={pos.x - 24} y={pos.y - 8} width="48" height="16" rx="4"
                    fill={isCorrupted ? 'rgba(255,45,85,0.2)' : (hoveredNode === node.id ? 'var(--bg-elevated)' : 'rgba(15, 21, 32, 0.8)')}
                    stroke={isCorrupted ? 'var(--color-critical)' : (hoveredNode === node.id ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)')}
                    animate={{ 
                      scale: hoveredNode === node.id ? 1.15 : 1,
                    }}
                  />
                  <text
                    x={pos.x} y={pos.y + 3}
                    textAnchor="middle"
                    style={{ fontSize: '7px', fill: isCorrupted ? '#ff2d55' : '#fff', fontFamily: 'var(--font-mono)', fontWeight: 600, pointerEvents: 'none' }}
                  >
                    {node.short}
                  </text>
                  {isCorrupted && (
                    <motion.circle
                      cx={pos.x} cy={pos.y} r="12"
                      stroke="var(--color-critical)"
                      strokeWidth="1"
                      fill="none"
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>
      </div>

      <div style={styles.anchorArea as any}>
        <div style={{ ...styles.anchorBox, borderColor: `${anchorColor}44`, background: `${anchorColor}11` } as any}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{ ...styles.statusDot, background: anchorColor, animation: (tamperActive || !latestBatch) ? 'pulse-critical 2s infinite' : 'none' } as any} />
            <div>
              <div style={{ fontSize: '9px', fontWeight: 800, color: anchorColor, letterSpacing: '1px' }}>BLOCKCHAIN ANCHOR</div>
              <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>
                {tamperActive ? 'ANCHOR INVALID' : anchorStatus}
              </div>
            </div>
          </div>
          <Link2 size={14} color={anchorColor} />
        </div>
        
        <div style={styles.batchDetails as any}>
          <div style={styles.detailItem as any}>
            <Database size={10} color="var(--text-dim)" /> 
            <span>TX: {tamperActive ? '0xBAD_HASH...' : (latestBatch?.tx_hash?.slice(0, 16) || '0x74f2...a1c9')}</span>
          </div>
          <div style={styles.detailItem as any}>
            <ShieldCheck size={10} color="var(--text-dim)" /> 
            <span>{tamperActive ? 'INTEGRITY BROKEN' : (latestBatch ? 'CONFIRMED' : 'NEXT MB: 4.2s')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: 'rgba(100, 210, 255, 0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  title: {
    fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
    letterSpacing: '-0.2px'
  },
  subtitle: {
    fontSize: '10px', color: 'var(--text-dim)',
    fontFamily: 'var(--font-mono)'
  },
  batchBadge: {
    fontSize: '9px', fontWeight: 800, background: 'rgba(45, 212, 191, 0.1)',
    color: 'var(--color-brand-accent)', padding: '4px 10px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', gap: '4px'
  },
  vizArea: {
    position: 'relative',
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  layers: {
    position: 'absolute',
    left: '0', top: '0', bottom: '0',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '10px 0',
    pointerEvents: 'none'
  },
  layerLabel: {
    fontSize: '8px', color: 'var(--text-dim)',
    fontFamily: 'var(--font-mono)', letterSpacing: '1px',
    transform: 'rotate(-90deg) translateX(0)',
    transformOrigin: 'left bottom',
    whiteSpace: 'nowrap'
  },
  anchorArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  anchorBox: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
  },
  statusDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    boxShadow: '0 0 8px currentColor'
  },
  batchDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    padding: '0 4px'
  },
  detailItem: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '10px', color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)'
  }
};
