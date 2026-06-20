"""Blockchain layer — stub mode + real web3.py mode with retry queue.

Stub returns mock tx hashes. Real mode sends Merkle roots to an EVM contract
with receipt confirmation, retry queue, and configurable gas.
"""

import time
import logging
from collections import deque
from .config import BLOCKCHAIN_ENABLED, RPC_URL, PRIVATE_KEY, ACCOUNT, CONTRACT_ADDRESS

logger = logging.getLogger(__name__)

ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "root", "type": "bytes32"}],
        "name": "storeRoot",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

# Retry queue for failed anchors
_failed_roots: deque[tuple[bytes, int]] = deque(maxlen=100)
_MAX_RETRIES = 3
_RETRY_DELAY_S = 30
_GAS_LIMIT = int(__import__("os").getenv("BLOCKCHAIN_GAS_LIMIT", "200000"))
_GAS_PRICE_MULTIPLIER = float(__import__("os").getenv("BLOCKCHAIN_GAS_PRICE_MULTIPLIER", "1.1"))


def send_root(root_bytes: bytes) -> str:
    """Anchor a Merkle root on-chain (or return stub tx hash).

    In real mode, waits for tx receipt and retries on failure.
    Failed roots are queued for later retry.

    Args:
        root_bytes: 32-byte Merkle root

    Returns:
        Transaction hash (hex string)
    """
    if not BLOCKCHAIN_ENABLED:
        return f"0xMOCK_{root_bytes.hex()[:16]}"

    try:
        from web3 import Web3
        from web3.exceptions import TransactionNotFound, TimeExhausted

        w3 = Web3(Web3.HTTPProvider(RPC_URL))
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI
        )

        nonce = w3.eth.get_transaction_count(ACCOUNT)
        gas_price = int(w3.eth.gas_price * _GAS_PRICE_MULTIPLIER)

        tx = contract.functions.storeRoot(root_bytes).build_transaction(
            {
                "from": ACCOUNT,
                "gas": _GAS_LIMIT,
                "gasPrice": gas_price,
                "nonce": nonce,
            }
        )
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        tx_hash_hex = w3.to_hex(tx_hash)

        # Wait for receipt confirmation
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120, poll_latency=2)
        if receipt["status"] == 1:
            block_number = receipt.get("blockNumber", 0)
            logger.info(
                f"[BLOCKCHAIN] Root anchored: tx={tx_hash_hex[:20]}... "
                f"block={block_number} gas_used={receipt.get('gasUsed', 0)}"
            )
            # Clear any previously failed roots for this batch
            _clear_failed(root_bytes)
            return tx_hash_hex
        else:
            logger.error(f"[BLOCKCHAIN] Transaction reverted: {tx_hash_hex}")
            _enqueue_retry(root_bytes)
            return f"0xFAILED_REVERT_{root_bytes.hex()[:16]}"

    except (TransactionNotFound, TimeExhausted) as e:
        logger.error(f"[BLOCKCHAIN] Transaction timeout: {e}")
        _enqueue_retry(root_bytes)
        return f"0xFAILED_TIMEOUT_{root_bytes.hex()[:16]}"
    except Exception as e:
        logger.error(f"[BLOCKCHAIN] Failed to anchor root: {e}")
        _enqueue_retry(root_bytes)
        return f"0xFAILED_{root_bytes.hex()[:16]}"


def _enqueue_retry(root_bytes: bytes):
    """Queue a failed root for retry."""
    _failed_roots.append((root_bytes, 0))
    logger.info(f"[BLOCKCHAIN] Queued root {root_bytes.hex()[:16]}... for retry")


def _clear_failed(root_bytes: bytes):
    """Remove a root from the retry queue once it succeeds."""
    global _failed_roots
    _failed_roots = deque(
        (r, c) for r, c in _failed_roots if r != root_bytes
    )


def retry_failed_roots() -> list[tuple[str, str]]:
    """Retry all queued failed roots.

    Returns:
        List of (root_hex, tx_hash_or_status) for each attempt.
    """
    if not BLOCKCHAIN_ENABLED:
        return []

    results = []
    remaining = deque(maxlen=100)

    while _failed_roots:
        root_bytes, attempt = _failed_roots.popleft()
        if attempt >= _MAX_RETRIES:
            logger.warning(f"[BLOCKCHAIN] Dropping root after {_MAX_RETRIES} failed attempts: {root_bytes.hex()[:16]}...")
            results.append((root_bytes.hex(), "DROPPED_MAX_RETRIES"))
            continue

        time.sleep(_RETRY_DELAY_S)
        tx_hash = send_root(root_bytes)
        if tx_hash.startswith("0xFAILED"):
            remaining.append((root_bytes, attempt + 1))
            results.append((root_bytes.hex(), f"RETRY_FAILED_{attempt + 1}"))
        else:
            results.append((root_bytes.hex(), tx_hash))

    _failed_roots = remaining
    return results


def get_failed_root_count() -> int:
    """Return the number of roots awaiting retry."""
    return len(_failed_roots)


def verify_root_on_chain(root_hex: str, tx_hash_hex: str) -> dict:
    """Verify a Merkle root was stored on-chain by checking the tx receipt.

    Args:
        root_hex: The Merkle root hex string to verify
        tx_hash_hex: The transaction hash hex string

    Returns:
        Dict with verification result including block number and status
    """
    if not BLOCKCHAIN_ENABLED:
        return {"verified": False, "reason": "Blockchain not enabled"}

    try:
        from web3 import Web3
        from web3.exceptions import TransactionNotFound

        w3 = Web3(Web3.HTTPProvider(RPC_URL))

        tx_hash = Web3.to_bytes(hexstr=tx_hash_hex)
        receipt = w3.eth.get_transaction_receipt(tx_hash)

        if receipt is None:
            return {"verified": False, "reason": "Transaction not found"}

        tx = w3.eth.get_transaction(tx_hash)
        if tx is None:
            return {"verified": False, "reason": "Transaction data not found"}

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI
        )
        decoded = contract.decode_function_input(tx["input"])

        stored_root = decoded[1].get("root", b"").hex()
        root_matches = stored_root == root_hex

        return {
            "verified": root_matches and receipt["status"] == 1,
            "root_matches": root_matches,
            "tx_status": receipt["status"],
            "block_number": receipt.get("blockNumber", 0),
            "block_hash": receipt.get("blockHash", b"").hex() if receipt.get("blockHash") else "",
            "gas_used": receipt.get("gasUsed", 0),
            "confirmations": w3.eth.block_number - receipt.get("blockNumber", 0),
        }

    except TransactionNotFound:
        return {"verified": False, "reason": "Transaction not found on chain"}
    except Exception as e:
        return {"verified": False, "reason": str(e)}
