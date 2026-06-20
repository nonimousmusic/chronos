"""Tests for the Merkle tree computation and proof verification.

These tests verify:
1. Empty input returns 32 zero bytes
2. Single leaf returns its own hash
3. Two leaves produce the expected composite root
4. Odd number of leaves duplicates the last element
5. merkle_root is deterministic
6. merkle_proof generates correct proofs for various positions
7. verify_merkle_proof validates proofs correctly
"""

import hashlib
from backend.app.merkle import merkle_root, merkle_proof, verify_merkle_proof


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


class TestMerkleProof:
    """Test Merkle proof generation and verification."""

    def test_proof_empty_leaves(self):
        """Empty leaves returns empty proof."""
        assert merkle_proof([], 0) == []

    def test_proof_out_of_range(self):
        """Index out of range returns empty proof."""
        leaves = [b"\x01" * 32, b"\x02" * 32]
        assert merkle_proof(leaves, -1) == []
        assert merkle_proof(leaves, 5) == []

    def test_proof_single_leaf(self):
        """Single leaf has no siblings — proof is empty."""
        leaves = [b"\xaa" * 32]
        proof = merkle_proof(leaves, 0)
        assert proof == []

    def test_proof_two_leaves_first(self):
        """Proof for leaf 0 of 2: sibling is leaf 1 (right position)."""
        a = b"\x01" * 32
        b_leaf = b"\x02" * 32
        proof = merkle_proof([a, b_leaf], 0)
        assert len(proof) == 1
        assert proof[0]["position"] == "right"
        assert proof[0]["hash"] == b_leaf

    def test_proof_two_leaves_second(self):
        """Proof for leaf 1 of 2: sibling is leaf 0 (left position)."""
        a = b"\x01" * 32
        b_leaf = b"\x02" * 32
        proof = merkle_proof([a, b_leaf], 1)
        assert len(proof) == 1
        assert proof[0]["position"] == "left"
        assert proof[0]["hash"] == a

    def test_proof_four_leaves_middle(self):
        """Proof for leaf 1 of 4: correct sibling path."""
        leaves = [bytes([i]) * 32 for i in range(4)]
        proof = merkle_proof(leaves, 1)
        # Leaf 1: sibling is leaf 0 (left) at level 1
        # Then combined hash sibling is H(leaf2+leaf3) at level 2 (right)
        assert len(proof) == 2
        assert proof[0]["position"] == "left"
        assert proof[0]["hash"] == leaves[0]
        expected_sibling = _h(leaves[2] + leaves[3])
        assert proof[1]["position"] == "right"
        assert proof[1]["hash"] == expected_sibling

    def test_verify_valid_proof(self):
        """A valid proof verifies successfully."""
        leaves = [bytes([i]) * 32 for i in range(4)]
        root = merkle_root(leaves)
        for i in range(4):
            proof = merkle_proof(leaves, i)
            assert verify_merkle_proof(leaves[i], proof, root)

    def test_verify_invalid_proof(self):
        """A proof with wrong leaf should fail verification."""
        leaves = [bytes([i]) * 32 for i in range(4)]
        root = merkle_root(leaves)
        wrong_leaf = b"\xff" * 32
        proof = merkle_proof(leaves, 0)
        assert not verify_merkle_proof(wrong_leaf, proof, root)

    def test_verify_tampered_proof(self):
        """A proof with tampered sibling should fail verification."""
        leaves = [bytes([i]) * 32 for i in range(4)]
        root = merkle_root(leaves)
        proof = merkle_proof(leaves, 0)
        # Tamper with the sibling hash
        proof[0]["hash"] = b"\xee" * 32
        assert not verify_merkle_proof(leaves[0], proof, root)

    def test_verify_three_leaves_all_positions(self):
        """All positions in an odd-leaf tree produce valid proofs."""
        leaves = [bytes([i]) * 32 for i in range(3)]
        root = merkle_root(leaves)
        for i in range(3):
            proof = merkle_proof(leaves, i)
            assert verify_merkle_proof(leaves[i], proof, root)
