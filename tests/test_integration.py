"""Integration tests: end-to-end from session ingestion to batch anchoring.

Tests the full pipeline:
  1. Build a valid session directory (frames + vitals + manifest)
  2. Verify session integrity with verifier.verify_session()
  3. Feed records into batcher and verify Merkle root computation
  4. Verify Merkle proof generation and verification
"""

import os
import sys
import json
import tempfile
from unittest.mock import patch, MagicMock

sys.modules.setdefault("supabase", MagicMock())

from backend.app.hasher import sha256_bytes, canonical_payload, compute_chain_hash
from backend.app.merkle import merkle_root, merkle_proof, verify_merkle_proof
from backend.app.batcher import Batcher
from backend.app.verifier import verify_session
from backend.app.config import CHAIN_GENESIS


def _build_session(num_records=10, genesis_hex="00" * 32):
    """Build a valid session directory with frames, vitals, and manifest."""
    session_dir = tempfile.mkdtemp()
    os.makedirs(os.path.join(session_dir, "frames"), exist_ok=True)
    os.makedirs(os.path.join(session_dir, "vitals"), exist_ok=True)

    prev = bytes.fromhex(genesis_hex)
    records = []

    for seq in range(num_records):
        ts = 1700000000 + seq
        frame_bytes = f"frame_data_{seq}".encode()
        vitals = {"hr": 72 + seq, "spo2": 98}

        frame_path = os.path.join(session_dir, f"frames/{seq}.jpg")
        with open(frame_path, "wb") as f:
            f.write(frame_bytes)

        vitals_path = os.path.join(session_dir, f"vitals/{seq}.json")
        with open(vitals_path, "w") as f:
            json.dump(vitals, f, sort_keys=True, separators=(",", ":"))

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


class TestFullPipelineIntegration:
    """Integration tests covering the full verification → batching → proof pipeline."""

    @patch("backend.app.batcher.BATCH_SIZE", 3)
    @patch("backend.app.batcher.send_root")
    def test_verify_then_batch(self, mock_send):
        """Verified session records should feed correctly into batcher."""
        mock_send.return_value = "0xMOCK_TX"
        session_dir, manifest = _build_session(10)

        # Step 1: Verify the session
        result = verify_session(session_dir, manifest)
        assert result["ok"] is True
        assert result["verified_count"] == 10

        # Step 2: Feed records into batcher
        batcher = Batcher()
        batches = []
        for record in manifest["records"]:
            batch = batcher.add(record)
            if batch is not None:
                batches.append(batch)

        # 10 records, BATCH_SIZE=3 => 3 full batches + 1 partial (not emitted)
        assert len(batches) == 3

        # Verify each batch
        for i, batch in enumerate(batches):
            start = i * 3
            end = start + 2
            assert batch["start_seq"] == start
            assert batch["end_seq"] == end
            assert batch["tx_hash"] == "0xMOCK_TX"

            # Re-compute expected Merkle root
            leaves = [
                bytes.fromhex(manifest["records"][j]["chain_hash"])
                for j in range(start, end + 1)
            ]
            expected_root = merkle_root(leaves)
            assert batch["root"] == expected_root.hex()

    @patch("backend.app.batcher.BATCH_SIZE", 4)
    @patch("backend.app.batcher.send_root")
    def test_merkle_proofs_in_batch(self, mock_send):
        """Each batch should contain valid Merkle proofs for every record."""
        mock_send.return_value = "0xTX"
        session_dir, manifest = _build_session(8)

        batcher = Batcher()
        batches = []
        for record in manifest["records"]:
            batch = batcher.add(record)
            if batch is not None:
                batches.append(batch)

        assert len(batches) == 2

        for batch in batches:
            proofs = batch.get("proofs", {})
            start = batch["start_seq"]
            end = batch["end_seq"]
            expected_leaves = [
                bytes.fromhex(manifest["records"][j]["chain_hash"])
                for j in range(start, end + 1)
            ]
            expected_root = bytes.fromhex(batch["root"])

            for seq_str, proof_list in proofs.items():
                seq = int(seq_str)
                idx = seq - start
                leaf = expected_leaves[idx]
                proof = [
                    {"position": p["position"], "hash": bytes.fromhex(p["hash"])}
                    for p in proof_list
                ]

                # Verify the proof against the root
                assert verify_merkle_proof(leaf, proof, expected_root)

    @patch("backend.app.batcher.BATCH_SIZE", 3)
    @patch("backend.app.batcher.send_root")
    def test_merkle_proof_after_tamper_detection(self, mock_send):
        """A tampered record should still have valid Merkle proof (proof proves
        inclusion, not correctness of data). Verification should catch the tamper."""
        mock_send.return_value = "0xTX"
        session_dir, manifest = _build_session(6)

        # Tamper with a frame
        frame_path = os.path.join(session_dir, "frames/2.jpg")
        with open(frame_path, "wb") as f:
            f.write(b"TAMPERED")

        # Verification fails at record 2
        result = verify_session(session_dir, manifest)
        assert result["ok"] is False
        assert result["failed_at"] == 2

        # But the batch still has valid Merkle proofs
        batcher = Batcher()
        batches = []
        for record in manifest["records"]:
            batch = batcher.add(record)
            if batch is not None:
                batches.append(batch)

        assert len(batches) == 2

        for batch in batches:
            proofs = batch.get("proofs", {})
            for seq_str, proof_list in proofs.items():
                seq = int(seq_str)
                leaf = bytes.fromhex(manifest["records"][seq]["chain_hash"])
                proof = [
                    {"position": p["position"], "hash": bytes.fromhex(p["hash"])}
                    for p in proof_list
                ]
                root = bytes.fromhex(batch["root"])
                assert verify_merkle_proof(leaf, proof, root)

    @patch("backend.app.batcher.BATCH_SIZE", 5)
    @patch("backend.app.batcher.send_root")
    def test_merkle_proof_odd_leaves(self, mock_send):
        """Batches with odd leaf counts should produce valid proofs (last leaf duplicated)."""
        mock_send.return_value = "0xTX"
        session_dir, manifest = _build_session(5)

        batcher = Batcher()
        batches = []
        for record in manifest["records"]:
            batch = batcher.add(record)
            if batch is not None:
                batches.append(batch)

        assert len(batches) == 1
        batch = batches[0]

        proofs = batch.get("proofs", {})
        for seq_str, proof_list in proofs.items():
            seq = int(seq_str)
            leaf = bytes.fromhex(manifest["records"][seq]["chain_hash"])
            proof = [
                {"position": p["position"], "hash": bytes.fromhex(p["hash"])}
                for p in proof_list
            ]
            root = bytes.fromhex(batch["root"])
            assert verify_merkle_proof(leaf, proof, root)
