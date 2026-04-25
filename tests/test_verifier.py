"""Tests for the session verification engine.

These tests verify:
1. A valid session passes verification
2. Tampered frame bytes cause hash mismatch
3. Missing frames are detected
4. Missing vitals are detected
5. Chain continuity is enforced (prev_hash links)
"""

import os
import sys
import json
import tempfile
from unittest.mock import MagicMock

# Mock supabase so verifier can be imported without the supabase package
sys.modules.setdefault("supabase", MagicMock())

from backend.app.hasher import sha256_bytes, canonical_payload, compute_chain_hash
from backend.app.verifier import verify_session


def _build_session(num_records=5, genesis_hex="00" * 32):
    """Build a valid session directory with frames, vitals, and manifest.
    
    Returns (session_dir, manifest) for testing.
    """
    session_dir = tempfile.mkdtemp()
    os.makedirs(os.path.join(session_dir, "frames"), exist_ok=True)
    os.makedirs(os.path.join(session_dir, "vitals"), exist_ok=True)

    prev = bytes.fromhex(genesis_hex)
    records = []

    for seq in range(num_records):
        ts = 1700000000 + seq
        frame_bytes = f"frame_data_{seq}".encode()
        vitals = {"hr": 72 + seq, "spo2": 98}

        # Write frame
        frame_path = os.path.join(session_dir, f"frames/{seq}.jpg")
        with open(frame_path, "wb") as f:
            f.write(frame_bytes)

        # Write vitals
        vitals_path = os.path.join(session_dir, f"vitals/{seq}.json")
        with open(vitals_path, "w") as f:
            json.dump(vitals, f, sort_keys=True, separators=(",", ":"))

        # Compute chain hash
        frame_sha = sha256_bytes(frame_bytes)
        payload = canonical_payload(
            seq=seq, ts=ts,
            frame_sha256_hex=frame_sha.hex(),
            vitals=vitals,
            prev_hash_hex=prev.hex(),
        )
        chain_hash = compute_chain_hash(payload)

        records.append({
            "seq": seq,
            "ts": ts,
            "frame": f"frames/{seq}.jpg",
            "vitals": f"vitals/{seq}.json",
            "frame_sha256": frame_sha.hex(),
            "chain_hash": chain_hash.hex(),
            "prev_hash": prev.hex(),
        })

        prev = chain_hash

    manifest = {
        "genesis_hash": genesis_hex,
        "records": records,
    }

    return session_dir, manifest


class TestVerifySession:
    """Test session integrity verification."""

    def test_valid_session_passes(self):
        """A properly constructed session verifies successfully."""
        session_dir, manifest = _build_session(5)
        result = verify_session(session_dir, manifest)
        assert result["ok"] is True
        assert result["verified_count"] == 5
        assert result["failed_at"] is None

    def test_single_record_passes(self):
        """Edge case: single-record session verifies."""
        session_dir, manifest = _build_session(1)
        result = verify_session(session_dir, manifest)
        assert result["ok"] is True
        assert result["verified_count"] == 1

    def test_empty_session_passes(self):
        """Edge case: empty manifest (no records) verifies."""
        session_dir, manifest = _build_session(0)
        result = verify_session(session_dir, manifest)
        assert result["ok"] is True
        assert result["verified_count"] == 0

    def test_tampered_frame_detected(self):
        """Modifying frame bytes causes verification to fail."""
        session_dir, manifest = _build_session(5)
        
        # Tamper with frame 2
        frame_path = os.path.join(session_dir, "frames/2.jpg")
        with open(frame_path, "wb") as f:
            f.write(b"TAMPERED DATA")

        result = verify_session(session_dir, manifest)
        assert result["ok"] is False
        assert result["failed_at"] == 2
        assert result["reason"] == "Hash mismatch — data was tampered"

    def test_tampered_vitals_detected(self):
        """Modifying vitals JSON causes verification to fail."""
        session_dir, manifest = _build_session(5)
        
        # Tamper with vitals for record 3
        vitals_path = os.path.join(session_dir, "vitals/3.json")
        with open(vitals_path, "w") as f:
            json.dump({"hr": 999, "spo2": 0}, f, sort_keys=True, separators=(",", ":"))

        result = verify_session(session_dir, manifest)
        assert result["ok"] is False
        assert result["failed_at"] == 3

    def test_missing_frame_detected(self):
        """Deleting a frame file is detected as FRAME_MISSING."""
        session_dir, manifest = _build_session(5)
        
        # Delete frame 1
        os.remove(os.path.join(session_dir, "frames/1.jpg"))

        result = verify_session(session_dir, manifest)
        assert result["ok"] is False
        assert result["failed_at"] == 1
        assert result["got"] == "FRAME_MISSING"

    def test_missing_vitals_detected(self):
        """Deleting a vitals file is detected as VITALS_MISSING."""
        session_dir, manifest = _build_session(5)
        
        # Delete vitals 0
        os.remove(os.path.join(session_dir, "vitals/0.json"))

        result = verify_session(session_dir, manifest)
        assert result["ok"] is False
        assert result["failed_at"] == 0
        assert result["got"] == "VITALS_MISSING"

    def test_cascade_failure(self):
        """Tampering record 0 causes all subsequent verifications to fail too (chain property)."""
        session_dir, manifest = _build_session(5)
        
        # Tamper with frame 0 — this breaks the chain from the start
        frame_path = os.path.join(session_dir, "frames/0.jpg")
        with open(frame_path, "wb") as f:
            f.write(b"INJECTED")

        result = verify_session(session_dir, manifest)
        assert result["ok"] is False
        assert result["failed_at"] == 0  # Fails at the first tampered record

    def test_verified_count_before_failure(self):
        """verified_count reflects how many records passed before the first failure."""
        session_dir, manifest = _build_session(10)
        
        # Tamper with frame 7
        frame_path = os.path.join(session_dir, "frames/7.jpg")
        with open(frame_path, "wb") as f:
            f.write(b"BAD")

        result = verify_session(session_dir, manifest)
        assert result["ok"] is False
        assert result["verified_count"] == 7  # Records 0-6 passed
        assert result["failed_at"] == 7
