"""Stateful chain worker — processes one frame+vitals per tick.

chain_hash = SHA256(canonical_json({seq, ts, frame_sha256, vitals, prev_hash}))
"""

import time
import cv2

from .hasher import sha256_bytes, canonical_payload, compute_chain_hash
from .storage import save_frame, save_json
from .config import JPEG_QUALITY


class ChainState:
    """Maintains rolling chain state: prev_hash + monotonic seq counter."""

    def __init__(self, genesis: bytes):
        self.prev_hash = genesis
        self.seq = 0


def process_one(
    frame,
    vitals: dict,
    state: ChainState,
    session_dir: str,
) -> dict:
    """Process a single frame+vitals tick.

    1. JPEG-encode frame
    2. SHA-256 frame bytes
    3. Build canonical payload
    4. Compute chain hash
    5. Save frame + vitals to disk
    6. Return record dict

    Returns:
        Record dict with seq, ts, paths, hashes.
    """
    ts = int(time.time())

    # JPEG-encode
    ok, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not ok:
        raise RuntimeError(f"JPEG encode failed at seq={state.seq}")
    frame_bytes = jpeg.tobytes()

    # Hash the raw frame bytes
    frame_sha = sha256_bytes(frame_bytes)

    # Build deterministic payload and chain hash
    payload = canonical_payload(
        seq=state.seq,
        ts=ts,
        frame_sha256_hex=frame_sha.hex(),
        vitals=vitals,
        prev_hash_hex=state.prev_hash.hex(),
    )
    chain_hash = compute_chain_hash(payload)

    # File paths (relative to session dir)
    frame_rel = f"frames/{state.seq}.jpg"
    vitals_rel = f"vitals/{state.seq}.json"
    frame_path = f"{session_dir}/{frame_rel}"
    vitals_path = f"{session_dir}/{vitals_rel}"

    # Persist to disk
    save_frame(frame_bytes, frame_path)
    save_json(vitals, vitals_path)

    # Build record
    rec = {
        "seq": state.seq,
        "ts": ts,
        "frame": frame_rel,
        "vitals": vitals_rel,
        "vitals_data": vitals,
        "frame_sha256": frame_sha.hex(),
        "chain_hash": chain_hash.hex(),
        "prev_hash": state.prev_hash.hex(),
    }

    # Advance state
    state.prev_hash = chain_hash
    state.seq += 1

    return rec


def verify_session(session_id: str, session_dir: str, genesis_hex: str) -> dict:
    """
    Verify the cryptographic integrity of an entire recorded session.
    Walks the chain from Genesis to the last frame.
    """
    import os
    import json

    manifest_path = os.path.join(session_dir, "manifest.json")
    if not os.path.exists(manifest_path):
        return {"valid": False, "error": "Manifest not found"}

    with open(manifest_path, "r") as f:
        manifest = json.load(f)

    records = manifest.get("records", [])
    if not records:
        return {"valid": False, "error": "No records in manifest"}

    current_prev = genesis_hex
    verified_count = 0

    for i, rec in enumerate(records):
        # 1. Check sequence
        if rec["seq"] != i:
            return {
                "valid": False,
                "reason": "sequence_gap",
                "failed_at": i,
                "verified_count": verified_count,
            }

        # 2. Check back-link
        if rec["prev_hash"] != current_prev:
            return {
                "valid": False,
                "reason": "prev_hash_mismatch",
                "failed_at": i,
                "expected": current_prev,
                "got": rec["prev_hash"],
                "verified_count": verified_count,
            }

        # 3. Re-compute chain hash (deterministic audit)
        payload = canonical_payload(
            seq=rec["seq"],
            ts=rec["ts"],
            frame_sha256_hex=rec["frame_sha256"],
            vitals=rec.get("vitals_data", {}),  # Note: assuming we store vitals_data or similar
            prev_hash_hex=rec["prev_hash"],
        )
        expected_hash_hex = compute_chain_hash(payload).hex()

        if rec["chain_hash"] != expected_hash_hex:
            # Check if we should use the actual vitals from disk for deeper verification
            # For now, we trust the manifest's cached vitals_data or raw vitals
            return {
                "valid": False,
                "reason": "chain_hash_mismatch",
                "failed_at": i,
                "expected": expected_hash_hex,
                "got": rec["chain_hash"],
                "verified_count": verified_count,
            }

        current_prev = rec["chain_hash"]
        verified_count += 1

    return {
        "valid": True,
        "verified_count": verified_count,
        "final_hash": current_prev,
    }
