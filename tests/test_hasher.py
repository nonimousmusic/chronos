"""Tests for the SHA-256 hashing and canonical payload serialization.

These tests verify:
1. sha256_bytes/sha256_hex produce correct digests
2. canonical_payload is deterministic (key-order independent)
3. compute_chain_hash correctly hashes canonical payloads
"""

from backend.app.hasher import sha256_bytes, sha256_hex, canonical_payload, compute_chain_hash


class TestSha256:
    """Test basic SHA-256 hashing functions."""

    def test_sha256_bytes_known_vector(self):
        """SHA-256 of empty string matches known digest."""
        result = sha256_bytes(b"")
        assert result.hex() == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    def test_sha256_hex_known_vector(self):
        """sha256_hex returns the same digest as sha256_bytes but in hex."""
        result = sha256_hex(b"hello")
        assert result == sha256_bytes(b"hello").hex()
        assert len(result) == 64  # 32 bytes in hex

    def test_sha256_deterministic(self):
        """Same input always produces same output."""
        data = b"surgical frame data"
        assert sha256_bytes(data) == sha256_bytes(data)

    def test_sha256_different_inputs(self):
        """Different inputs produce different hashes."""
        assert sha256_bytes(b"frame_a") != sha256_bytes(b"frame_b")


class TestCanonicalPayload:
    """Test deterministic JSON payload construction."""

    def test_canonical_payload_is_bytes(self):
        """canonical_payload returns bytes."""
        result = canonical_payload(
            seq=0,
            ts=1000000,
            frame_sha256_hex="aa" * 32,
            vitals={"hr": 72},
            prev_hash_hex="00" * 32,
        )
        assert isinstance(result, bytes)

    def test_canonical_payload_deterministic(self):
        """Same inputs always produce identical byte output."""
        args = dict(
            seq=1,
            ts=1700000000,
            frame_sha256_hex="ab" * 32,
            vitals={"hr": 80, "spo2": 98},
            prev_hash_hex="cd" * 32,
        )
        a = canonical_payload(**args)
        b = canonical_payload(**args)
        assert a == b

    def test_canonical_payload_sorts_keys(self):
        """Vitals key order doesn't affect output (sorted keys)."""
        a = canonical_payload(
            seq=0, ts=100,
            frame_sha256_hex="aa" * 32,
            vitals={"z_field": 1, "a_field": 2},
            prev_hash_hex="00" * 32,
        )
        b = canonical_payload(
            seq=0, ts=100,
            frame_sha256_hex="aa" * 32,
            vitals={"a_field": 2, "z_field": 1},
            prev_hash_hex="00" * 32,
        )
        assert a == b

    def test_canonical_payload_compact_separators(self):
        """Output uses compact JSON separators (no spaces)."""
        result = canonical_payload(
            seq=0, ts=100,
            frame_sha256_hex="aa" * 32,
            vitals={"hr": 72},
            prev_hash_hex="00" * 32,
        )
        text = result.decode("utf-8")
        assert " " not in text  # No whitespace in compact JSON
        assert ": " not in text


class TestComputeChainHash:
    """Test chain hash computation."""

    def test_returns_bytes(self):
        """compute_chain_hash returns 32 raw bytes."""
        payload = canonical_payload(
            seq=0, ts=100,
            frame_sha256_hex="aa" * 32,
            vitals={},
            prev_hash_hex="00" * 32,
        )
        result = compute_chain_hash(payload)
        assert isinstance(result, bytes)
        assert len(result) == 32

    def test_chain_hash_deterministic(self):
        """Same payload always yields the same chain hash."""
        payload = canonical_payload(
            seq=0, ts=100,
            frame_sha256_hex="aa" * 32,
            vitals={"hr": 72},
            prev_hash_hex="00" * 32,
        )
        a = compute_chain_hash(payload)
        b = compute_chain_hash(payload)
        assert a == b

    def test_chain_hash_is_sha256_of_payload(self):
        """compute_chain_hash is equivalent to sha256_bytes on payload."""
        payload = canonical_payload(
            seq=5, ts=9999,
            frame_sha256_hex="ff" * 32,
            vitals={"bp": 120},
            prev_hash_hex="00" * 32,
        )
        assert compute_chain_hash(payload) == sha256_bytes(payload)
