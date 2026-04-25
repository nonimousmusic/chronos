"""Verification engine — re-reads stored records, recomputes chain, detects tampering.

This is THE CORE FEATURE for interviews:
  Load manifest → re-read frame bytes + vitals → recompute chain hash → compare.
"""

import os

from .hasher import sha256_bytes, canonical_payload, compute_chain_hash
from .storage import load_json


def verify_session(session_dir: str, manifest: dict) -> dict:
    """Verify the integrity of a stored recording session.

    Algorithm:
        prev = genesis_hash
        for each record in manifest:
            frame_bytes = read(frame_path)
            vitals = read(vitals_path)
            frame_hash = sha256(frame_bytes)
            payload = canonical({seq, ts, frame_hash, vitals, prev})
            recomputed = sha256(payload)
            if recomputed != stored chain_hash:
                FAIL at seq
            prev = recomputed
        SUCCESS

    Args:
        session_dir: Absolute path to session directory
        manifest: Parsed manifest.json

    Returns:
        {"ok": bool, "verified_count": int, "failed_at": int|None,
         "expected": str|None, "got": str|None}
    """
    genesis_hex = manifest.get("genesis_hash", "00" * 32)
    prev = bytes.fromhex(genesis_hex)
    records = manifest.get("records", [])

    for i, rec in enumerate(records):
        seq = rec["seq"]
        ts = rec["ts"]
        stored_chain_hash = rec["chain_hash"]
        stored_prev_hash = rec["prev_hash"]

        # ── Read stored files ──
        frame_path = os.path.join(session_dir, rec["frame"])
        vitals_path = os.path.join(session_dir, rec["vitals"])

        # Handle missing frame (deletion attack)
        if not os.path.exists(frame_path):
            return {
                "ok": False,
                "verified_count": i,
                "failed_at": seq,
                "expected": stored_chain_hash,
                "got": "FRAME_MISSING",
                "reason": f"Frame file missing: {rec['frame']}",
            }

        # Handle missing vitals
        if not os.path.exists(vitals_path):
            return {
                "ok": False,
                "verified_count": i,
                "failed_at": seq,
                "expected": stored_chain_hash,
                "got": "VITALS_MISSING",
                "reason": f"Vitals file missing: {rec['vitals']}",
            }

        # Read raw bytes/data
        with open(frame_path, "rb") as f:
            frame_bytes = f.read()
        vitals = load_json(vitals_path)

        # Recompute frame hash
        frame_sha = sha256_bytes(frame_bytes)

        # Recompute chain hash
        payload = canonical_payload(
            seq=seq,
            ts=ts,
            frame_sha256_hex=frame_sha.hex(),
            vitals=vitals,
            prev_hash_hex=prev.hex(),
        )
        recomputed = compute_chain_hash(payload)

        if recomputed.hex() != stored_chain_hash:
            return {
                "ok": False,
                "verified_count": i,
                "failed_at": seq,
                "expected": stored_chain_hash,
                "got": recomputed.hex(),
                "reason": "Hash mismatch — data was tampered",
            }

        prev = recomputed

    return {
        "ok": True,
        "verified_count": len(records),
        "failed_at": None,
        "expected": None,
        "got": None,
    }
