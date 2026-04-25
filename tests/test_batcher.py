"""Tests for the Batcher — Merkle root batching with blockchain anchoring.

These tests verify:
1. Records below BATCH_SIZE don't trigger a batch
2. Reaching BATCH_SIZE produces a batch with correct Merkle root
3. Batcher resets after producing a batch
4. Multiple sequential batches work correctly
"""

import sys
from unittest.mock import patch, MagicMock

# Mock supabase so batcher can be imported without the supabase package
sys.modules.setdefault("supabase", MagicMock())

from backend.app.batcher import Batcher
from backend.app.merkle import merkle_root


def _make_record(seq: int, chain_hash_hex: str) -> dict:
    """Build a minimal record dict for testing."""
    return {"seq": seq, "chain_hash": chain_hash_hex}


class TestBatcher:
    """Test Merkle root batching logic."""

    @patch("backend.app.batcher.BATCH_SIZE", 3)
    def test_below_batch_size_returns_none(self):
        """Adding records below BATCH_SIZE returns None."""
        batcher = Batcher()
        r1 = batcher.add(_make_record(0, "aa" * 32))
        r2 = batcher.add(_make_record(1, "bb" * 32))
        assert r1 is None
        assert r2 is None

    @patch("backend.app.batcher.BATCH_SIZE", 3)
    @patch("backend.app.batcher.send_root")
    def test_batch_triggered_at_size(self, mock_send):
        """Reaching BATCH_SIZE triggers a batch with correct Merkle root."""
        mock_send.return_value = "0xMOCK_TX"
        batcher = Batcher()

        hashes = ["aa" * 32, "bb" * 32, "cc" * 32]
        results = []
        for i, h in enumerate(hashes):
            results.append(batcher.add(_make_record(i, h)))

        # First two return None, third triggers batch
        assert results[0] is None
        assert results[1] is None
        assert results[2] is not None

        batch = results[2]
        assert batch["start_seq"] == 0
        assert batch["end_seq"] == 2
        assert batch["tx_hash"] == "0xMOCK_TX"

        # Verify Merkle root matches
        expected_root = merkle_root([bytes.fromhex(h) for h in hashes])
        assert batch["root"] == expected_root.hex()

    @patch("backend.app.batcher.BATCH_SIZE", 2)
    @patch("backend.app.batcher.send_root")
    def test_batcher_resets_after_batch(self, mock_send):
        """After producing a batch, batcher starts fresh."""
        mock_send.return_value = "0xMOCK"
        batcher = Batcher()

        # First batch
        batcher.add(_make_record(0, "aa" * 32))
        batch1 = batcher.add(_make_record(1, "bb" * 32))
        assert batch1 is not None
        assert batch1["start_seq"] == 0

        # Second batch starts fresh
        r3 = batcher.add(_make_record(2, "cc" * 32))
        assert r3 is None  # Not full yet

        batch2 = batcher.add(_make_record(3, "dd" * 32))
        assert batch2 is not None
        assert batch2["start_seq"] == 2
        assert batch2["end_seq"] == 3

    @patch("backend.app.batcher.BATCH_SIZE", 2)
    @patch("backend.app.batcher.send_root")
    def test_send_root_called_with_correct_bytes(self, mock_send):
        """send_root is called with the computed Merkle root bytes."""
        mock_send.return_value = "0xTX"
        batcher = Batcher()

        hashes = ["11" * 32, "22" * 32]
        batcher.add(_make_record(0, hashes[0]))
        batcher.add(_make_record(1, hashes[1]))

        expected_root = merkle_root([bytes.fromhex(h) for h in hashes])
        mock_send.assert_called_once_with(expected_root)
