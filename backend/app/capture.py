"""Camera capture pipeline.

Priority:
  1. DepthAI OAK-D (if CAMERA_SOURCE == "depthai")
  2. OpenCV webcam  (if CAMERA_SOURCE == "webcam")
  3. Synthetic frames (gradient + noise)
"""

import cv2
import numpy as np
import threading

from .config import CAMERA_WIDTH, CAMERA_HEIGHT, CAMERA_SOURCE, JPEG_QUALITY

_pipeline = None   # DepthAI pipeline object
_queue = None      # DepthAI output queue
_cap = None        # OpenCV VideoCapture
_mode = "none"     # "depthai" | "webcam" | "synthetic"
_lock = threading.Lock()
_latest_jpeg = None  # cached JPEG bytes for MJPEG streaming


def start_pipeline(width=None, height=None):
    """Start capture source. Falls back gracefully."""
    global _pipeline, _queue, _cap, _mode

    w = width or CAMERA_WIDTH
    h = height or CAMERA_HEIGHT

    # ── 1. Try DepthAI ──
    if CAMERA_SOURCE == "depthai":
        try:
            import depthai as dai

            pipeline = dai.Pipeline()
            cam = pipeline.create(dai.node.Camera).build()
            rgb = cam.requestOutput((w, h), dai.ImgFrame.Type.BGR888p)
            q = rgb.createOutputQueue(maxSize=1, blocking=False)
            pipeline.start()

            _pipeline = pipeline
            _queue = q
            _mode = "depthai"
            print(f"[CAPTURE] DepthAI camera started ({w}x{h})")
            return True
        except Exception as e:
            print(f"[CAPTURE] DepthAI unavailable: {e}")

    # ── 2. Try OpenCV webcam ──
    if CAMERA_SOURCE in ("webcam", "depthai"):
        try:
            cap = cv2.VideoCapture(0)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
                _cap = cap
                _mode = "webcam"
                print(f"[CAPTURE] Webcam started ({w}x{h})")
                return True
            else:
                cap.release()
                print("[CAPTURE] Webcam not available")
        except Exception as e:
            print(f"[CAPTURE] Webcam error: {e}")

    # ── 3. Synthetic fallback ──
    _mode = "synthetic"
    print(f"[CAPTURE] Using synthetic frames ({w}x{h})")
    return False


def get_frame():
    """Get a single frame as numpy array (H, W, 3) BGR uint8."""
    global _mode

    # DepthAI
    if _mode == "depthai" and _queue is not None:
        try:
            img_frame = _queue.get()
            return img_frame.getCvFrame()
        except Exception:
            _mode = "synthetic"

    # OpenCV webcam
    if _mode == "webcam" and _cap is not None:
        try:
            ret, frame = _cap.read()
            if ret and frame is not None:
                return frame
            else:
                _mode = "synthetic"
        except Exception:
            _mode = "synthetic"

    # Synthetic
    w = CAMERA_WIDTH
    h = CAMERA_HEIGHT
    gradient = np.tile(np.linspace(30, 80, w, dtype=np.uint8), (h, 1))
    frame = np.stack([gradient, gradient, gradient], axis=-1)
    noise = np.random.randint(0, 15, (h, w, 3), dtype=np.uint8)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    t = int(np.random.random() * 200)
    frame[10:14, 10:60] = [t, max(0, min(255, 200 - t)), 100]
    return frame


def get_jpeg():
    """Get current frame as JPEG bytes (for MJPEG streaming)."""
    global _latest_jpeg
    frame = get_frame()
    ok, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if ok:
        with _lock:
            _latest_jpeg = jpeg.tobytes()
        return _latest_jpeg
    return _latest_jpeg or b""


def get_latest_jpeg():
    """Return the most recently cached JPEG (thread-safe for concurrent readers)."""
    with _lock:
        return _latest_jpeg


def is_running() -> bool:
    """Check if a capture source is active."""
    if _mode == "depthai" and _pipeline is not None:
        return _pipeline.isRunning()
    if _mode == "webcam" and _cap is not None:
        return _cap.isOpened()
    if _mode == "synthetic":
        return True
    return False


def get_mode() -> str:
    """Return current capture mode."""
    return _mode


def stop():
    """Release all capture resources."""
    global _pipeline, _queue, _cap, _mode
    if _pipeline is not None:
        try:
            _pipeline.stop()
        except Exception:
            pass
    _pipeline = None
    _queue = None

    if _cap is not None:
        try:
            _cap.release()
        except Exception:
            pass
    _cap = None

    _mode = "none"
