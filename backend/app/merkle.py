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
