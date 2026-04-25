"""Batcher — accumulates chain hashes and produces Merkle roots.

Every BATCH_SIZE records, computes Merkle root and anchors on blockchain.
"""

from .merkle import merkle_root
from .blockchain import send_root
from .config import BATCH_SIZE


class Batcher:
    """Accumulates chain hashes, batches them into Merkle roots."""

    def __init__(self):
        self.buf: list[bytes] = []
        self.start_seq: int | None = None

    def add(self, rec: dict) -> dict | None:
        """Add a record's chain_hash to the buffer.

        Returns:
            Batch dict if batch is full, else None.
        """
        if self.start_seq is None:
            self.start_seq = rec["seq"]

        self.buf.append(bytes.fromhex(rec["chain_hash"]))

        if len(self.buf) >= BATCH_SIZE:
            root = merkle_root(self.buf)
            tx_hash = send_root(root)

            batch = {
                "start_seq": self.start_seq,
                "end_seq": rec["seq"],
                "root": root.hex(),
                "tx_hash": tx_hash,
            }

            self.buf.clear()
            self.start_seq = None
            return batch

        return None
