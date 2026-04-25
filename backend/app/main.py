"""Main pipeline runner — async loop: capture → sample → hash → store → batch.

Can be run:
  - CLI:  python -m app.main --with-api         (API on :8000)
  - API:  POST /api/start  → starts pipeline in background
          POST /api/stop   → stops pipeline
"""

import asyncio
import os
import time
import uuid
import json
import argparse
import threading

from .config import BASE_DATA_DIR, FPS_SAMPLE, CHAIN_GENESIS
from .chain import ChainState, process_one
from .capture import start_pipeline, get_frame, is_running, stop, get_jpeg
from .vitals_source import VitalsSource
from .batcher import Batcher
from .storage import ensure_dirs, save_manifest


# ── Shared state for API coordination ──
_pipeline_task = None          # asyncio.Task
_pipeline_running = False
_ws_clients = set()            # WebSocket connections to broadcast to
_current_session_id = None
_current_patient_id = None


def get_pipeline_running():
    return _pipeline_running


def get_current_session_id():
    return _current_session_id


def get_current_patient_id():
    return _current_patient_id


def register_ws(ws):
    _ws_clients.add(ws)


def unregister_ws(ws):
    _ws_clients.discard(ws)


def run_api_server():
    """Start FastAPI in a background thread."""
    import uvicorn
    from .api import app
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


async def broadcast_ws(data: dict):
    """Send JSON data to all connected WebSocket clients."""
    if not _ws_clients:
        return
    msg = json.dumps(data)
    dead = set()
    for ws in _ws_clients.copy():
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _ws_clients.discard(ws)


async def pipeline(duration: int = 0, with_api: bool = False):
    """Run the capture → hash → store pipeline.

    Args:
        duration: How many seconds to run (0 = indefinite)
        with_api: If True, start the API server in a background thread
    """
    global _pipeline_running, _current_session_id

    # ── Start API server if requested ──
    if with_api:
        api_thread = threading.Thread(target=run_api_server, daemon=True)
        api_thread.start()
        print("[MAIN] API server started on :8000")

    await run_pipeline(duration, patient_id=None)


async def run_pipeline(duration: int = 0, patient_id: str = None):
    """Core pipeline loop — can be called from CLI or API."""
    global _pipeline_running, _current_session_id, _current_patient_id

    # ── Initialize session ──
    session_id = str(uuid.uuid4())
    _current_session_id = session_id
    _current_patient_id = patient_id
    session_dir = os.path.abspath(os.path.join(BASE_DATA_DIR, session_id))
    ensure_dirs(
        os.path.join(session_dir, "frames"),
        os.path.join(session_dir, "vitals"),
    )

    print(f"[MAIN] Session: {session_id}")
    print(f"[MAIN] Directory: {session_dir}")

    # ── Initialize components ──
    state = ChainState(genesis=CHAIN_GENESIS)
    vitals_src = VitalsSource()
    batcher = Batcher()

    manifest = {
        "session_id": session_id,
        "genesis_hash": CHAIN_GENESIS.hex(),
        "records": [],
        "merkle_batches": [],
    }
    manifest_path = os.path.join(session_dir, "manifest.json")

    # ── Start camera ──
    start_pipeline()
    _pipeline_running = True

    # ── Global handle for current chain state (for API anchoring) ──
    global _current_chain_state
    _current_chain_state = state

    # ── Update live API state ──
    try:
        from .api import set_live_state
    except ImportError:
        set_live_state = None

    # ── Main loop ──
    start_time = time.time()
    interval = 1.0 / FPS_SAMPLE
    batch_count = 0

    print(f"[MAIN] Pipeline running at {FPS_SAMPLE} FPS (Ctrl+C to stop)")

    try:
        while _pipeline_running:
            tick_start = time.time()

            # Check duration limit
            if duration > 0 and (tick_start - start_time) >= duration:
                print(f"[MAIN] Duration limit reached ({duration}s)")
                break

            # Capture frame
            frame = get_frame()

            # Get vitals
            vitals = vitals_src.next()

            # Process: JPEG encode → SHA-256 → chain hash → save to disk
            rec = process_one(frame, vitals, state, session_dir)

            # Also cache JPEG for streaming
            get_jpeg()

            # Append to manifest
            manifest["records"].append(rec)

            # Try batching (every BATCH_SIZE records → Merkle root → blockchain)
            batch = batcher.add(rec)
            if batch:
                manifest["merkle_batches"].append(batch)
                batch_count += 1
                print(
                    f"[MAIN] Batch {batch_count}: "
                    f"seq {batch['start_seq']}-{batch['end_seq']} "
                    f"root={batch['root'][:16]}... "
                    f"tx={batch['tx_hash'][:24]}..."
                )

            # Save manifest (overwrite each tick for crash recovery)
            save_manifest(manifest, manifest_path)

            # Update live state for API
            if set_live_state:
                set_live_state(
                    session_id=session_id,
                    seq=state.seq,
                    latest_hash=state.prev_hash.hex(),
                    prev_hash=rec["prev_hash"],
                    batches=batch_count,
                )

            # Broadcast to WebSocket clients
            await broadcast_ws({
                "type": "chain_update",
                "session_id": session_id,
                "seq": rec["seq"],
                "ts": rec["ts"],
                "chain_hash": rec["chain_hash"],
                "prev_hash": rec["prev_hash"],
                "frame_sha256": rec["frame_sha256"],
                "vitals": vitals,
                "batch_count": batch_count,
                "elapsed": round(time.time() - start_time, 1),
            })

            # Progress logging
            if state.seq % 10 == 0:
                elapsed = time.time() - start_time
                print(
                    f"[MAIN] seq={state.seq} "
                    f"hash={state.prev_hash.hex()[:16]}... "
                    f"elapsed={elapsed:.1f}s"
                )

            # Wait for next tick
            elapsed_tick = time.time() - tick_start
            sleep_time = max(0, interval - elapsed_tick)
            await asyncio.sleep(sleep_time)

    except KeyboardInterrupt:
        print("\n[MAIN] Stopping pipeline...")
    except asyncio.CancelledError:
        print("\n[MAIN] Pipeline cancelled via API...")
    finally:
        _pipeline_running = False
        stop()
        # Final manifest save
        save_manifest(manifest, manifest_path)

        # Broadcast session complete
        await broadcast_ws({
            "type": "session_complete",
            "session_id": session_id,
            "total_records": len(manifest["records"]),
            "total_batches": len(manifest["merkle_batches"]),
            "chain_hash": state.prev_hash.hex(),
            "vitals": rec.get("vitals") if 'rec' in locals() else None,
        })

        print(f"[MAIN] Session saved: {session_id}")
        print(f"[MAIN] Records: {len(manifest['records'])}")
        print(f"[MAIN] Batches: {len(manifest['merkle_batches'])}")
        print(f"[MAIN] Manifest: {manifest_path}")

    return session_id


def get_current_chain_state():
    return globals().get("_current_chain_state")


async def start_pipeline_async(duration: int = 0, patient_id: str = None):
    """Start pipeline as background asyncio task (called from API)."""
    global _pipeline_task
    if _pipeline_running:
        return None  # Already running
    _pipeline_task = asyncio.create_task(run_pipeline(duration, patient_id))
    return _pipeline_task


def stop_pipeline():
    """Signal the pipeline to stop."""
    global _pipeline_running
    _pipeline_running = False


def main():
    parser = argparse.ArgumentParser(description="Surgical Black Box Pipeline")
    parser.add_argument("--duration", type=int, default=0, help="Duration in seconds (0=indefinite)")
    parser.add_argument("--with-api", action="store_true", help="Also start the API server")
    args = parser.parse_args()

    asyncio.run(pipeline(duration=args.duration, with_api=args.with_api))


if __name__ == "__main__":
    main()
