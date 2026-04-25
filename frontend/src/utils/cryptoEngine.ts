/**
 * cryptoEngine.ts — Browser-side SHA-256 + Merkle via Web Crypto API.
 * 
 * Used for:
 *  1. Client-side verification of backend chain (independent of server)
 *  2. Live UI hash display
 *  3. Merkle tree visualization data
 * 
 * Hash chain formula (identical to backend):
 *   H[n] = SHA256(canonical_json({seq, ts, frame_sha256, vitals, prev_hash}))
 */

// ── SHA-256 ──

export async function sha256(input: string | BufferSource): Promise<string> {
  const data = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : input;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufToHex(hashBuffer);
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Canonical JSON (must match Python: sort_keys=True, separators=(",",":")) ──

interface PayloadInputs {
  seq: number;
  ts: number;
  frame_sha256: string;
  vitals: any;
  prev_hash: string;
}

export function canonicalPayload({ seq, ts, frame_sha256, vitals, prev_hash }: PayloadInputs): string {
  const obj = {
    frame_sha256,
    prev_hash,
    seq,
    ts,
    vitals,
  } as Record<string, any>;
  return JSON.stringify(obj, Object.keys(obj).sort(), 0)
    .replace(/\s/g, '');
}

// Proper canonical with sorted keys at all levels
function sortedStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(sortedStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  const parts = keys.map(k => JSON.stringify(k) + ':' + sortedStringify(obj[k]));
  return '{' + parts.join(',') + '}';
}

export function canonicalPayloadStrict({ seq, ts, frame_sha256, vitals, prev_hash }: PayloadInputs): string {
  const obj = { frame_sha256, prev_hash, seq, ts, vitals };
  return sortedStringify(obj);
}

// ── Chain Hash ──

export async function computeChainHash({ seq, ts, frame_sha256, vitals, prev_hash }: PayloadInputs): Promise<string> {
  const payload = canonicalPayloadStrict({ seq, ts, frame_sha256, vitals, prev_hash });
  return await sha256(payload);
}

// ── Merkle Root ──

export async function merkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return '00'.repeat(32);

  let level = [...leaves];

  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = i + 1 < level.length ? level[i + 1] : a;
      next.push(await sha256(a + b));
    }
    level = next;
  }

  return level[0];
}

// ── Chain Verification (client-side) ──

interface VerificationResult {
  ok: boolean;
  verified_count: number;
  failed_at: number | null;
  expected?: string;
  got?: string;
}

export async function verifyChain(records: any[], genesisHash: string = '00'.repeat(32)): Promise<VerificationResult> {
  let prev = genesisHash;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const recomputed = await computeChainHash({
      seq: rec.seq,
      ts: rec.ts,
      frame_sha256: rec.frame_sha256,
      vitals: rec.vitals,
      prev_hash: prev,
    });

    if (recomputed !== rec.chain_hash) {
      return {
        ok: false,
        verified_count: i,
        failed_at: rec.seq,
        expected: rec.chain_hash,
        got: recomputed,
      };
    }
    prev = recomputed;
  }

  return { ok: true, verified_count: records.length, failed_at: null };
}

// ── Chain State (for live UI) ──

export interface ChainRecord {
  seq: number;
  ts: number;
  frame_sha256: string;
  vitals: any;
  chain_hash: string;
  prev_hash: string;
}

export class ChainState {
  private prevHash: string;
  private seq: number;
  public records: ChainRecord[];

  constructor(genesis: string = '00'.repeat(32)) {
    this.prevHash = genesis;
    this.seq = 0;
    this.records = [];
  }

  async addRecord(ts: number, frame_sha256: string, vitals: any): Promise<ChainRecord> {
    const chain_hash = await computeChainHash({
      seq: this.seq,
      ts,
      frame_sha256,
      vitals,
      prev_hash: this.prevHash,
    });

    const rec: ChainRecord = {
      seq: this.seq,
      ts,
      frame_sha256,
      vitals,
      chain_hash,
      prev_hash: this.prevHash,
    };

    this.records.push(rec);
    this.prevHash = chain_hash;
    this.seq++;

    return rec;
  }
}
