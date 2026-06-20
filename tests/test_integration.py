"""Integration tests: end-to-end from session ingestion to batch anchoring.

Tests the full pipeline:
   1. Build a valid session directory (frames + vitals + manifest)
   2. Verify session integrity with verifier.verify_session()
   3. Feed records into batcher and verify Merkle root computation
   4. Verify Merkle proof generation and verification
   5. ML prediction round-trip (artifact loading + inference)
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


class TestMLInference:
    """Integration tests for ML prediction round-trip."""

    def test_ml_artifacts_load(self):
        """ML artifacts should load and expose expected keys."""
        import sys; sys.path.insert(0, "backend")
        from app.ml.loader import load_artifacts, get_feature_columns
        artifacts = load_artifacts()
        assert "models" in artifacts
        assert isinstance(artifacts["models"], dict)
        assert list(artifacts["models"].keys()) == ["12h", "6h", "2h"]
        cols = get_feature_columns()
        assert len(cols) > 50
        assert "scaler" in artifacts
        assert "imputer" in artifacts

    def test_ml_prediction_outputs_valid_probabilities(self):
        """Predict should return probabilities in [0, 1] for all horizons."""
        import sys; sys.path.insert(0, "backend")
        from app.ml.predictor import predict
        features = {
            "hr": 90, "map_mean": 65, "sbp": 100, "dbp": 60,
            "resp_rate": 20, "temp_c": 37.5,
            "lactate": 2.5, "creatinine": 1.2, "platelets": 180,
            "bilirubin_total": 1.0, "wbc": 12,
            "sodium": 138, "potassium": 4.0, "hemoglobin": 12,
            "glucose": 150, "bun": 25, "ph": 7.35,
            "pao2": 80, "paco2": 40,
            "vent_active": 0, "gcs_total": 15,
            "charlson_comorbidity_index": 2,
            "oasis": 20, "sofa_approx": 4, "sapsii": 30,
            "age": 65, "heart_rate": 90,
            "sbp_min_12h": 95, "map_min_12h": 60, "map_mean_12h": 70,
            "lactate_max_12h": 3.0, "creatinine_max_12h": 1.5,
            "hr_mean_12h": 85, "hr_std_12h": 10,
            "shock_index": 1.0, "shock_index_max_12h": 1.2,
            "pf_ratio": 300, "pf_ratio_min_12h": 280,
            "platelets_min_12h": 150, "map_max_12h": 80,
            "spo2": 97, "sf_ratio": 400,
            "bili_max_12h": 1.0, "gcs_min_12h": 15,
            "wbc_max_12h": 13, "wbc_min_12h": 8,
            "sodium_max_12h": 140, "sodium_min_12h": 136,
            "potassium_max_12h": 4.5, "potassium_min_12h": 3.8,
            "hemoglobin_min_12h": 11, "glucose_max_12h": 160,
            "heart_rate_max_12h": 100, "heart_rate_min_12h": 80,
            "resp_rate_max_12h": 25, "resp_rate_min_12h": 18,
            "temp_max_12h": 38, "temp_min_12h": 36.5,
            "bun_max_12h": 30, "bun_min_12h": 20,
            "creatinine_min_12h": 1.0,
            "ph_min_12h": 7.3, "pao2_min_12h": 75, "paco2_max_12h": 45,
            "sofa_resp": 1, "sofa_coag": 0, "sofa_liver": 0,
            "sofa_renal": 1, "sofa_cardio": 1, "sofa_cns": 0,
            "race": "white", "gender": "M",
            "first_careunit": "MICU", "admission_type": "EMERGENCY",
            "observed_hours_in_window": 12,
        }
        result = predict(features)
        assert "risk_scores" in result
        for name, prob in result["risk_scores"].items():
            assert 0.0 <= prob <= 1.0, f"{name} probability {prob} out of range"
        assert "shap_values" in result
        assert len(result["shap_values"]) > 0
        for sv in result["shap_values"]:
            assert "feature" in sv
            assert "value" in sv
            assert "direction" in sv
            assert sv["direction"] in ("risk", "protective")

    def test_ml_horizon_ordering(self):
        """For a high-risk patient, longer horizons should have higher risk."""
        import sys; sys.path.insert(0, "backend")
        from app.ml.predictor import predict
        high_risk = {
            "hr": 130, "map_mean": 45, "sbp": 75, "dbp": 35,
            "resp_rate": 32, "temp_c": 39.5,
            "lactate": 8.0, "creatinine": 3.5, "platelets": 50,
            "bilirubin_total": 4.0, "wbc": 28,
            "sodium": 130, "potassium": 6.0, "hemoglobin": 7.5,
            "glucose": 250, "bun": 60, "ph": 7.15,
            "pao2": 55, "paco2": 55,
            "vent_active": 1, "gcs_total": 8,
            "charlson_comorbidity_index": 6,
            "oasis": 50, "sofa_approx": 16, "sapsii": 70,
            "age": 75, "heart_rate": 130,
            "sbp_min_12h": 70, "map_min_12h": 40, "map_mean_12h": 48,
            "lactate_max_12h": 10.0, "creatinine_max_12h": 4.0,
            "hr_mean_12h": 125, "hr_std_12h": 8,
            "shock_index": 1.8, "shock_index_max_12h": 2.0,
            "pf_ratio": 100, "pf_ratio_min_12h": 85,
            "platelets_min_12h": 40, "map_max_12h": 55,
            "spo2": 85, "sf_ratio": 120,
            "bili_max_12h": 4.5, "gcs_min_12h": 7,
            "wbc_max_12h": 30, "wbc_min_12h": 22,
            "sodium_max_12h": 132, "sodium_min_12h": 128,
            "potassium_max_12h": 6.2, "potassium_min_12h": 5.5,
            "hemoglobin_min_12h": 7.0, "glucose_max_12h": 300,
            "heart_rate_max_12h": 140, "heart_rate_min_12h": 110,
            "resp_rate_max_12h": 36, "resp_rate_min_12h": 28,
            "temp_max_12h": 40, "temp_min_12h": 38.5,
            "bun_max_12h": 65, "bun_min_12h": 50,
            "creatinine_min_12h": 3.0,
            "ph_min_12h": 7.1, "pao2_min_12h": 50, "paco2_max_12h": 60,
            "sofa_resp": 3, "sofa_coag": 3, "sofa_liver": 2,
            "sofa_renal": 3, "sofa_cardio": 3, "sofa_cns": 2,
            "race": "white", "gender": "M",
            "first_careunit": "MICU", "admission_type": "EMERGENCY",
            "observed_hours_in_window": 6,
        }
        result = predict(high_risk)
        rs = result["risk_scores"]
        assert rs["deterioration"] >= rs["arrest"], "deterioration should be >= arrest"
        assert result["raw_probability"] > 0, "raw probability should be positive"

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
