"""Merkle tree computation for batching chain hashes."""

import hashlib


def _h(x: bytes) -> bytes:
    return hashlib.sha256(x).digest()


def merkle_root(leaves: list[bytes]) -> bytes:
    """Compute Merkle root from a list of leaf hashes (bytes32 each).

    If odd number of leaves, the last leaf is duplicated.
    Empty list returns 32 zero bytes.
    """
    if not leaves:
        return b"\x00" * 32

    level = leaves[:]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            a = level[i]
            b = level[i + 1] if i + 1 < len(level) else a
            next_level.append(_h(a + b))
        level = next_level

    return level[0]


def merkle_proof(leaves: list[bytes], index: int) -> list[dict]:
    """Generate a Merkle proof for a leaf at the given index.

    Returns a list of sibling hashes with direction indicators,
    needed to prove the leaf is included in the Merkle tree.

    Args:
        leaves: List of leaf hashes (bytes32 each)
        index: Index of the leaf to prove

    Returns:
        List of dicts: [{"position": "left"|"right", "hash": bytes}, ...]
    """
    if not leaves or index < 0 or index >= len(leaves):
        return []

    proof: list[dict] = []
    level = leaves[:]
    idx = index

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            a = level[i]
            b = level[i + 1] if i + 1 < len(level) else a
            combined = _h(a + b)
            next_level.append(combined)

            if i == idx:
                proof.append({"position": "right", "hash": b})
            elif i + 1 == idx or (idx == len(level) - 1 and i + 1 >= len(level)):
                proof.append({"position": "left", "hash": a})

        idx //= 2
        level = next_level

    return proof


def verify_merkle_proof(leaf: bytes, proof: list[dict], root: bytes) -> bool:
    """Verify a Merkle proof for a leaf against a known root.

    Args:
        leaf: The leaf hash to verify
        proof: List of dicts with position and hash from merkle_proof()
        root: The expected Merkle root

    Returns:
        True if the proof is valid
    """
    computed = leaf
    for sibling in proof:
        if sibling["position"] == "left":
            computed = _h(sibling["hash"] + computed)
        else:
            computed = _h(computed + sibling["hash"])
    return computed == root
