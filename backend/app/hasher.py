"""SHA-256 hashing and canonical JSON serialization.

All hash chain operations are deterministic:
  H[n] = SHA256(canonical_json({seq, ts, frame_sha256, vitals, prev_hash}))
"""

import hashlib
import json


def sha256_bytes(b: bytes) -> bytes:
    """Return raw SHA-256 digest of arbitrary bytes."""
    return hashlib.sha256(b).digest()


def sha256_hex(b: bytes) -> str:
    """Return hex SHA-256 digest."""
    return hashlib.sha256(b).hexdigest()


def canonical_payload(
    seq: int,
    ts: int,
    frame_sha256_hex: str,
    vitals: dict,
    prev_hash_hex: str,
) -> bytes:
    """Build deterministic JSON payload for chain hashing.

    Sort keys + compact separators ensures byte-identical output across runs.
    """
    payload = {
        "frame_sha256": frame_sha256_hex,
        "prev_hash": prev_hash_hex,
        "seq": seq,
        "ts": ts,
        "vitals": vitals,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def compute_chain_hash(payload_bytes: bytes) -> bytes:
    """Compute chain hash from canonical payload bytes."""
    return sha256_bytes(payload_bytes)
