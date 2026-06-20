"""FastAPI endpoints for the surgical black box backend.

Endpoints:
  GET  /api/health              — health check
  GET  /api/status              — live session chain state
  GET  /api/recordings          — list all stored sessions
  GET  /api/stream              — MJPEG live video stream
  WS   /ws/live                 — real-time chain hash + vitals
  POST /api/start               — start recording session
  POST /api/stop                — stop recording session
  POST /api/verify/{session_id} — re-verify a session's chain integrity
  POST /api/tamper/{session_id}/{seq} — simulate tampering
  GET  /api/snapshot             — single JPEG frame (polling fallback)
  POST /api/tick                 — process one pipeline tick (serverless fallback)
  POST /api/predict              — Chronos ML risk prediction (77-feature vector → risk scores + SHAP)
  GET  /api/ml/status            — ML model loading status
"""


import os
import json
import asyncio
import time
import uuid
import traceback
from enum import Enum
from typing import cast, Dict, Any, Optional, List

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, Request
import logging

logger = logging.getLogger(__name__)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import BASE_DATA_DIR, IS_VERCEL

app = FastAPI(title="Surgical Black Box API", version="2.0.0")

# ── Global Error Handler for Vercel Tracebacks ──
if IS_VERCEL:
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Log full traceback server-side, but never expose to client
        print(f"[ERROR] {request.url.path}: {exc}")
        print(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "message": "Internal server error",
                "path": request.url.path
            }
        )

# ── Deployment: Serve Frontend Static Files ──
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DIST = os.path.join(ROOT_DIR, "frontend", "dist")

# Only mount static files on local dev (Vercel handles it via vercel.json)
if os.path.exists(FRONTEND_DIST) and not IS_VERCEL:
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")

# CORS (configurable via CORS_ORIGINS env var, comma-separated)
_DEFAULT_ORIGINS = "https://synapse-gtb.vercel.app,http://localhost:5173,http://localhost:3000"
_cors_origins_str = os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS)
_cors_origins = [o.strip() for o in _cors_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Shared State & Lazy Helpers ──
_live_state = {
    "session_id": None,
    "seq": 0,
    "latest_hash": "",
    "prev_hash": "",
    "batches": 0,
    "running": False,
    "camera_mode": "none",
}

def get_capture_module():
    from . import capture
    return capture

def get_main_module():
    from . import main
    return main

def get_storage_module():
    from . import storage
    return storage

def set_live_state(session_id, seq, latest_hash, prev_hash, batches, running=True):
    cap = get_capture_module()
    _live_state.update({
        "session_id": session_id,
        "seq": seq,
        "latest_hash": latest_hash,
        "prev_hash": prev_hash,
        "batches": batches,
        "running": running,
        "camera_mode": cap.get_mode(),
    })

# ── Endpoints ──

@app.get("/api/health")
async def health():
    cap = get_capture_module()
    return {
        "ok": True, 
        "camera_mode": cap.get_mode(),
        "deployment": "vercel" if IS_VERCEL else "local"
    }

@app.get("/api/snapshot")
async def snapshot():
    cap = get_capture_module()
    if not cap.is_running():
        cap.start_pipeline()
    jpeg_bytes = cap.get_jpeg()
    if not jpeg_bytes:
        raise HTTPException(status_code=503, detail="Camera not ready")
    return StreamingResponse(iter([jpeg_bytes]), media_type="image/jpeg")

@app.get("/api/status")
async def status():
    main = get_main_module()
    cap = get_capture_module()
    _live_state["running"] = main.get_pipeline_running()
    _live_state["camera_mode"] = cap.get_mode()
    if not _live_state["session_id"]:
        _live_state["session_id"] = main.get_current_session_id()
    return _live_state

@app.get("/api/recordings")
async def list_recordings():
    """List all stored sessions with summary info, checking Supabase first."""
    store = get_storage_module()
    
    # 1. Try Supabase Storage
    if store.supabase:
        try:
            objs = store.supabase.storage.from_(store.BUCKET_NAME).list("")
            recordings = []
            for item in objs:
                if 'name' in item:
                    sid = item['name']
                    manifest_path = f"{sid}/manifest.json"
                    try:
                        manifest_data = store.supabase.storage.from_(store.BUCKET_NAME).download(manifest_path)
                        manifest = json.loads(manifest_data)
                        recordings.append({
                            "session_id": sid,
                            "records": len(manifest.get("records", [])),
                            "batches": len(manifest.get("merkle_batches", [])),
                            "genesis_hash": manifest.get("genesis_hash", ""),
                        })
                    except Exception as e:
                        print(f"[RECORDS] Skipping {sid}: {e}")
                        continue
            if recordings:
                return recordings
        except Exception as e:
            print(f"[RECORDS] Supabase list failed: {e}")

    # 2. Local Fallback
    sessions_dir = os.path.abspath(BASE_DATA_DIR)
    if not os.path.exists(sessions_dir):
        return []

    recordings = []
    for sid in sorted(os.listdir(sessions_dir)):
        manifest_path = os.path.join(sessions_dir, sid, "manifest.json")
        if os.path.exists(manifest_path):
            try:
                manifest = store.load_manifest(manifest_path)
                recordings.append({
                    "session_id": sid,
                    "records": len(manifest.get("records", [])),
                    "batches": len(manifest.get("merkle_batches", [])),
                    "genesis_hash": manifest.get("genesis_hash", ""),
                })
            except Exception as e:
                print(f"[RECORDS] Skipping local session {sid}: {e}")
                continue
    return recordings

# ── MJPEG Stream ──
async def mjpeg_generator():
    cap = get_capture_module()
    while True:
        jpeg_bytes = cap.get_jpeg()
        if jpeg_bytes:
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg_bytes + b"\r\n")
        await asyncio.sleep(0.1)

@app.get("/api/stream")
async def video_stream():
    cap = get_capture_module()
    if not cap.is_running():
        cap.start_pipeline()
    return StreamingResponse(mjpeg_generator(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/api/frame/{session_id}/{seq}")
async def get_session_frame(session_id: str, seq: int):
    store = get_storage_module()
    session_dir = os.path.join(os.path.abspath(BASE_DATA_DIR), session_id)
    manifest_path = os.path.join(session_dir, "manifest.json")

    # This route currently expects local files. In a real cloud setup, we'd redirect to Supabase URL.
    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=404, detail="Session not found locally")

    manifest = store.load_manifest(manifest_path)
    rec = next((r for r in manifest.get("records", []) if r["seq"] == seq), None)
    if not rec:
        raise HTTPException(status_code=404, detail="Frame not found")

    frame_path = os.path.join(session_dir, rec["frame"])
    return FileResponse(frame_path, media_type="image/jpeg")

@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    main = get_main_module()
    await ws.accept()
    main.register_ws(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        main.unregister_ws(ws)

# ── Pipeline Control ──
@app.post("/api/start")
async def start_session(request: Request, duration: int = Query(default=0)):
    main = get_main_module()
    cap = get_capture_module()
    
    if main.get_pipeline_running():
        return {"status": "already_running", "session_id": main.get_current_session_id()}
        
    # Extract patient_id from body if exists
    patient_id = None
    try:
        body = await request.json()
        patient_id = body.get("patient_id")
    except:
        pass

    await main.start_pipeline_async(duration, patient_id)
    await asyncio.sleep(0.5)
    return {
        "status": "started",
        "session_id": main.get_current_session_id(),
        "patient_id": patient_id,
        "camera_mode": cap.get_mode(),
    }

@app.post("/api/stop")
async def stop_session():
    main = get_main_module()
    if not main.get_pipeline_running():
        return {"status": "not_running"}
    
    sid = main.get_current_session_id()
    pid = main.get_current_patient_id()
    state = main.get_current_chain_state()
    
    # ── Server-side integrity anchoring ──
    try:
        from .supabase_client import supabase
        if supabase and pid and state:
            final_hash = state.prev_hash.hex()
            # Anchor final block in Supabase (Production Bridge)
            supabase.from_("ot_blocks").insert({
                "patient_id": pid,
                "curr_hash": final_hash,
                "recorded_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            }).execute()
            print(f"[API] Final anchor stored for session {sid}")
    except Exception as e:
        print(f"[API] Supabase anchoring failed: {e}")

    main.stop_pipeline()
    return {"status": "stopped", "session_id": sid, "patient_id": pid}

# ── Verification & Tamper ──
@app.post("/api/verify/{session_id}")
async def verify_recording(session_id: str):
    from .verifier import verify_session
    store = get_storage_module()
    
    session_dir = os.path.join(os.path.abspath(BASE_DATA_DIR), session_id)
    manifest_path = os.path.join(session_dir, "manifest.json")

    if not os.path.exists(manifest_path):
        if store.supabase:
            try:
                data = store.supabase.storage.from_(store.BUCKET_NAME).download(f"{session_id}/manifest.json")
                manifest = json.loads(data)
                return {"status": "manifest_only", "message": "Verified against cloud manifest (frames not checked)"}
            except Exception as e:
                print(f"[VERIFY] Cloud manifest fetch failed for {session_id}: {e}")
        raise HTTPException(status_code=404, detail="Session not found")

    manifest = store.load_manifest(manifest_path)
    return verify_session(session_dir, manifest)

class TamperMode(str, Enum):
    modify_vitals = "modify_vitals"
    modify_frame = "modify_frame"
    delete_frame = "delete_frame"
    reorder = "reorder"

@app.post("/api/tamper/{session_id}/{seq}")
async def tamper_record(session_id: str, seq: int, mode: TamperMode = Query(default=TamperMode.modify_vitals)):
    store = get_storage_module()
    session_dir = os.path.join(os.path.abspath(BASE_DATA_DIR), session_id)
    manifest_path = os.path.join(session_dir, "manifest.json")

    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=404, detail="Session not found locally")

    manifest = store.load_manifest(manifest_path)
    records = manifest.get("records", [])
    rec_idx = next((i for i, r in enumerate(records) if r["seq"] == seq), None)

    if rec_idx is None:
        raise HTTPException(status_code=404, detail="Record not found")
    
    r_ptr = records[rec_idx]

    if mode == TamperMode.modify_vitals:
        v_path = os.path.join(session_dir, r_ptr["vitals"])
        v = store.load_json(v_path)
        v["hr"] = int(v.get("hr", 80)) + 50
        store.save_json(v, v_path)
    elif mode == TamperMode.modify_frame:
        f_path = os.path.join(session_dir, r_ptr["frame"])
        with open(f_path, "r+b") as f:
            f.seek(100)
            f.write(b"\xFF" * 100)
    elif mode == TamperMode.delete_frame:
        f_path = os.path.join(session_dir, r_ptr["frame"])
        if os.path.exists(f_path): os.remove(f_path)
    elif mode == TamperMode.reorder:
        if rec_idx + 1 < len(records):
            v_a = os.path.join(session_dir, r_ptr["vitals"])
            v_b = os.path.join(session_dir, records[rec_idx+1]["vitals"])
            data_a, data_b = store.load_json(v_a), store.load_json(v_b)
            store.save_json(data_b, v_a)
            store.save_json(data_a, v_b)

    return {"status": "tampered", "mode": mode.value, "seq": seq}


# ── Chronos ML Inference ─────────────────────────────────────────────────────

@app.post("/api/predict")
async def predict_risk(request: Request):
    """
    Run Chronos risk prediction on a 77-feature vector.

    Request body: JSON dict of feature values matching the simulation engine
                  output (hr, map_mean, sbp, ..., observed_hours_in_window).

    Returns:
        - risk_scores: { shock, sepsis, deterioration, arrest }
        - aggregate_risk: max of the above
        - shap_values: top 6 SHAP feature contributions
        - raw_probability: base model output
    """
    try:
        from .ml.predictor import predict
        features = await request.json()
        result = predict(features)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"Model not loaded: {e}")
    except Exception as e:
        print(f"[PREDICT ERROR] {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Prediction failed")


@app.get("/api/ml/status")
async def ml_status():
    """Check if ML model artifacts are loaded and ready."""
    try:
        from .ml.loader import is_loaded, get_feature_columns, load_artifacts
        if not is_loaded():
            try:
                load_artifacts()
            except Exception as e:
                return {"loaded": False, "error": str(e)}
        loaded = is_loaded()
        cols = get_feature_columns() if loaded else []
        return {
            "loaded": loaded,
            "feature_count": len(cols),
            "features": cols[:5] + ["..."] if len(cols) > 5 else cols
        }
    except Exception as e:
        return {"loaded": False, "error": str(e)}


@app.get("/api/chain-verify/{session_id}")
async def verify_audit_chain(session_id: str):
    """Verify the integrity of a session's chain of hashes (manifest-level).

    Re-computes the hash chain from the manifest's own data without re-reading
    frame/vitals files from disk. Faster than POST /api/verify/{session_id}.
    """
    from .chain import verify_session
    from .config import BASE_DATA_DIR, CHAIN_GENESIS
    
    session_dir = os.path.join(BASE_DATA_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Session not found")
        
    result = verify_session(session_id, session_dir, CHAIN_GENESIS.hex())
    return result


@app.get("/api/blockchain-verify/{session_id}")
async def verify_blockchain_anchoring(session_id: str):
    """Verify that all Merkle batches from a session are anchored on-chain.

    Checks each batch's tx_hash and root against the EVM chain.
    """
    from .blockchain import verify_root_on_chain
    store = get_storage_module()
    
    session_dir = os.path.join(os.path.abspath(BASE_DATA_DIR), session_id)
    manifest_path = os.path.join(session_dir, "manifest.json")

    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=404, detail="Session not found")

    manifest = store.load_manifest(manifest_path)
    batches = manifest.get("merkle_batches", [])

    if not batches:
        return {"verified": False, "reason": "No Merkle batches found in session"}

    results = []
    all_verified = True
    for batch in batches:
        chain_result = verify_root_on_chain(batch["root"], batch["tx_hash"])
        results.append({
            "batch": f"{batch.get('start_seq', '?')}-{batch.get('end_seq', '?')}",
            "root": batch["root"],
            "tx_hash": batch["tx_hash"],
            **chain_result,
        })
        if not chain_result.get("verified", False):
            all_verified = False

    return {
        "session_id": session_id,
        "all_verified": all_verified,
        "batches_checked": len(batches),
        "results": results,
    }


@app.get("/api/merkle-proof/{session_id}/{seq}")
async def get_merkle_proof(session_id: str, seq: int):
    """Get the Merkle proof for a specific record in a session.

    Returns the Merkle proof, batch root, and tx_hash so an external
    auditor can independently verify the record against the blockchain.
    """
    store = get_storage_module()
    
    session_dir = os.path.join(os.path.abspath(BASE_DATA_DIR), session_id)
    manifest_path = os.path.join(session_dir, "manifest.json")

    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=404, detail="Session not found")

    manifest = store.load_manifest(manifest_path)
    batches = manifest.get("merkle_batches", [])

    for batch in batches:
        proofs = batch.get("proofs", {})
        if str(seq) in proofs:
            return {
                "session_id": session_id,
                "seq": seq,
                "proof": proofs[str(seq)],
                "root": batch["root"],
                "tx_hash": batch["tx_hash"],
                "start_seq": batch.get("start_seq"),
                "end_seq": batch.get("end_seq"),
            }

    # Check if record exists but no proof is available
    records = manifest.get("records", [])
    if any(r["seq"] == seq for r in records):
        return {
            "session_id": session_id,
            "seq": seq,
            "proof": None,
            "reason": "Record found but no Merkle proof available (batch may not have been completed)",
        }

    raise HTTPException(status_code=404, detail="Record not found in session")
