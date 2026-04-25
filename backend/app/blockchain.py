"""Blockchain layer — stub mode + real web3.py mode.

Stub returns mock tx hashes. Real mode sends Merkle roots to an EVM contract.
"""

from .config import BLOCKCHAIN_ENABLED, RPC_URL, PRIVATE_KEY, ACCOUNT, CONTRACT_ADDRESS

ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "root", "type": "bytes32"}],
        "name": "storeRoot",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


def send_root(root_bytes: bytes) -> str:
    """Anchor a Merkle root on-chain (or return stub tx hash).

    Args:
        root_bytes: 32-byte Merkle root

    Returns:
        Transaction hash (hex string)
    """
    if not BLOCKCHAIN_ENABLED:
        return f"0xMOCK_{root_bytes.hex()[:16]}"

    try:
        from web3 import Web3

        w3 = Web3(Web3.HTTPProvider(RPC_URL))
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI
        )

        nonce = w3.eth.get_transaction_count(ACCOUNT)
        tx = contract.functions.storeRoot(root_bytes).build_transaction(
            {
                "from": ACCOUNT,
                "gas": 200000,
                "gasPrice": w3.eth.gas_price,
                "nonce": nonce,
            }
        )
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        return w3.to_hex(tx_hash)

    except Exception as e:
        print(f"[BLOCKCHAIN] Failed to anchor root: {e}")
        # Fallback to stub on failure
        return f"0xFAILED_{root_bytes.hex()[:16]}"
