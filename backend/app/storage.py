"""Disk and Supabase Hybrid storage for frames, vitals, and session manifests."""

import json
import os
from .supabase_client import supabase

BUCKET_NAME = "sessions"

def ensure_dirs(*dirs):
    """Create directories if they don't exist (local only)."""
    for d in dirs:
        try:
            os.makedirs(d, exist_ok=True)
        except Exception:
            pass # Vercel may block this, that's fine if we use Supabase

from .config import BASE_DATA_DIR

def _get_storage_path(path: str) -> str:
    """Normalize path for Supabase Storage (relative to bucket)."""
    # Remove BASE_DATA_DIR prefix if present
    if path.startswith(BASE_DATA_DIR):
        rel = os.path.relpath(path, BASE_DATA_DIR)
        return rel.replace("\\", "/") # Ensure forward slashes
    return path.replace("\\", "/")

def save_frame(frame_bytes: bytes, path: str):
    """Write raw JPEG bytes to Supabase Storage (preferred) or disk."""
    if supabase:
        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                path=_get_storage_path(path),
                file=frame_bytes,
                file_options={"content-type": "image/jpeg", "upsert": "true"}
            )
            return
        except Exception as e:
            print(f"[STORAGE] Supabase upload failed: {e}")

    # Fallback to local
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(frame_bytes)
    except Exception as e:
         print(f"[STORAGE] Local save failed: {e}")

def load_frame(path: str) -> bytes:
    """Read raw JPEG bytes from Supabase Storage or disk."""
    if supabase:
        try:
            return supabase.storage.from_(BUCKET_NAME).download(_get_storage_path(path))
        except Exception:
            pass

    # Fallback to local
    with open(path, "rb") as f:
        return f.read()

def save_json(obj: dict, path: str):
    """Write deterministic JSON to Supabase Storage or disk."""
    data = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    if supabase:
        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                path=_get_storage_path(path),
                file=data.encode(),
                file_options={"content-type": "application/json", "upsert": "true"}
            )
            return
        except Exception:
            pass

    # Fallback to local
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(data)

def load_json(path: str) -> dict:
    """Read JSON from Supabase Storage or disk."""
    if supabase:
        try:
            data = supabase.storage.from_(BUCKET_NAME).download(_get_storage_path(path))
            return json.loads(data)
        except Exception:
            pass

    # Fallback to local
    with open(path, "r") as f:
        return json.load(f)

def save_manifest(manifest: dict, path: str):
    """Write session manifest to Supabase Storage or disk."""
    data = json.dumps(manifest, indent=2, sort_keys=True)
    if supabase:
        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                path=_get_storage_path(path),
                file=data.encode(),
                file_options={"content-type": "application/json", "upsert": "true"}
            )
            return
        except Exception:
            pass

    # Fallback to local
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(data)

def load_manifest(path: str) -> dict:
    """Read session manifest from Supabase Storage or disk."""
    if supabase:
        try:
            data = supabase.storage.from_(BUCKET_NAME).download(_get_storage_path(path))
            return json.loads(data)
        except Exception:
            pass

    # Fallback to local
    with open(path, "r") as f:
        return json.load(f)
