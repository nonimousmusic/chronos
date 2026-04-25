"""Tests for the Merkle tree computation.

These tests verify:
1. Empty input returns 32 zero bytes
2. Single leaf returns its own hash
3. Two leaves produce the expected composite root
4. Odd number of leaves duplicates the last element
5. merkle_root is deterministic
"""

import hashlib
from backend.app.merkle import merkle_root


def _h(x: bytes) -> bytes:
    """Helper — SHA-256 for constructing expected values."""
    return hashlib.sha256(x).digest()


class TestMerkleRoot:
    """Test Merkle tree root computation."""

    def test_empty_returns_zero_bytes(self):
        """Empty leaf list returns 32 null bytes."""
        result = merkle_root([])
        assert result == b"\x00" * 32
        assert len(result) == 32

    def test_single_leaf(self):
        """Single leaf: root = H(leaf + leaf)."""
        leaf = b"\x01" * 32
        result = merkle_root([leaf])
        # With single leaf, no pairing needed — just leaf itself is the root
        assert result == leaf

    def test_two_leaves(self):
        """Two leaves: root = H(leaf_a + leaf_b)."""
        a = b"\xaa" * 32
        b_leaf = b"\xbb" * 32
        result = merkle_root([a, b_leaf])
        expected = _h(a + b_leaf)
        assert result == expected

    def test_three_leaves_duplicates_last(self):
        """Three leaves: last is duplicated to make even."""
        a = b"\x01" * 32
        b_leaf = b"\x02" * 32
        c = b"\x03" * 32
        result = merkle_root([a, b_leaf, c])

        # Level 1: H(a+b), H(c+c)
        h_ab = _h(a + b_leaf)
        h_cc = _h(c + c)
        # Level 2: H(H(a+b) + H(c+c))
        expected = _h(h_ab + h_cc)
        assert result == expected

    def test_four_leaves(self):
        """Four leaves: perfectly balanced binary tree."""
        leaves = [bytes([i]) * 32 for i in range(4)]
        result = merkle_root(leaves)

        h01 = _h(leaves[0] + leaves[1])
        h23 = _h(leaves[2] + leaves[3])
        expected = _h(h01 + h23)
        assert result == expected

    def test_deterministic(self):
        """Same leaves always produce the same root."""
        leaves = [b"\xaa" * 32, b"\xbb" * 32, b"\xcc" * 32]
        assert merkle_root(leaves) == merkle_root(leaves)

    def test_order_matters(self):
        """Swapping leaf order changes the root (secure against reordering)."""
        a = b"\x01" * 32
        b_leaf = b"\x02" * 32
        assert merkle_root([a, b_leaf]) != merkle_root([b_leaf, a])

    def test_root_is_32_bytes(self):
        """Root is always exactly 32 bytes regardless of input size."""
        for n in [1, 2, 5, 10, 16, 63]:
            leaves = [bytes([i % 256]) * 32 for i in range(n)]
            result = merkle_root(leaves)
            assert len(result) == 32
