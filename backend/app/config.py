import os
from dotenv import load_dotenv

load_dotenv()

# Directories
IS_VERCEL = os.getenv("VERCEL") == "1"
BASE_DATA_DIR = os.getenv("BASE_DATA_DIR", "/tmp/sessions" if IS_VERCEL else "data/sessions")

# Capture
FPS_SAMPLE = int(os.getenv("FPS_SAMPLE", "1"))
CAMERA_WIDTH = int(os.getenv("CAMERA_WIDTH", "640"))
CAMERA_HEIGHT = int(os.getenv("CAMERA_HEIGHT", "480"))
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "70"))
# Camera source: "depthai", "webcam", or "synthetic"
CAMERA_SOURCE = os.getenv("CAMERA_SOURCE", "webcam")

# Batching
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "60"))

# Blockchain (stub by default)
RPC_URL = os.getenv("RPC_URL", "")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
ACCOUNT = os.getenv("ACCOUNT", "")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")
BLOCKCHAIN_ENABLED = os.getenv("BLOCKCHAIN_ENABLED", "false").lower() == "true"

# Vitals source
VITALS_FILE = os.getenv(
    "VITALS_FILE",
    os.path.join(os.path.dirname(__file__), "../../frontend/src/data/extracted_vitals.json"),
)

# Genesis hash (64 hex zeros)
CHAIN_GENESIS_HEX = os.getenv(
    "CHAIN_GENESIS_HEX",
    "0000000000000000000000000000000000000000000000000000000000000000",
)
CHAIN_GENESIS = bytes.fromhex(CHAIN_GENESIS_HEX)
