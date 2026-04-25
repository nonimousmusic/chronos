"""
Model artifact loader for the Chronos risk prediction pipeline.

Loads XGBoost models, scaler, imputer, and feature column definitions
from the canonical `chronos_models/` directory at startup.
"""

import os
import logging
import warnings
from typing import Optional, Dict, Any, List

import joblib

logger = logging.getLogger(__name__)

# Path to the canonical model artifacts directory
_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_MODELS_DIR = os.path.join(_ROOT, "models")

# Singleton cache — loaded once at startup
_artifacts: Dict[str, Any] = {}
_loaded: bool = False


def _load_artifact(filename: str) -> Any:
    """Load a joblib-serialized artifact from the models directory."""
    path = os.path.join(_MODELS_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model artifact not found: {path}")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # suppress sklearn version mismatch warnings
        return joblib.load(path)


def load_artifacts() -> Dict[str, Any]:
    """
    Load all model artifacts into memory. Called once at startup.

    Returns a dict with keys:
        - models: the XGBoost model(s) — could be a single model or dict of models
        - scaler: sklearn StandardScaler/MinMaxScaler
        - imputer: sklearn SimpleImputer
        - feature_cols: list of feature column names (model input order)
        - feature_names_fe: feature names after feature engineering
        - high_miss_cols: columns with high missingness (to exclude/handle)
        - calibrators: (optional) Platt scaling calibrators per horizon
        - optimal_thresholds: (optional) per-horizon alarm thresholds
    """
    global _artifacts, _loaded

    if _loaded:
        return _artifacts

    logger.info(f"Loading Chronos model artifacts from: {_MODELS_DIR}")

    try:
        _artifacts["models"] = _load_artifact("xgb_models.pkl")
        _artifacts["scaler"] = _load_artifact("scaler.pkl")
        _artifacts["imputer"] = _load_artifact("imputer.pkl")
        _artifacts["feature_cols"] = _load_artifact("feature_cols.pkl")

        # Optional artifacts — may not exist in all versions
        # Feature names (try versioned file first, then generic)
        _artifacts["feature_names_fe"] = None
        for fe_file in ["feature_names_fe.pkl", "feature_names_fe_105.pkl"]:
            try:
                _artifacts["feature_names_fe"] = _load_artifact(fe_file)
                break
            except FileNotFoundError:
                continue
        # Auto-discover versioned feature_names_fe_<N>.pkl files
        if _artifacts["feature_names_fe"] is None:
            import glob
            pattern = os.path.join(_MODELS_DIR, "feature_names_fe_*.pkl")
            matches = sorted(glob.glob(pattern))
            if matches:
                _artifacts["feature_names_fe"] = _load_artifact(os.path.basename(matches[-1]))
        if _artifacts["feature_names_fe"] is None:
            logger.warning("No feature_names_fe artifact found — using feature_cols")

        try:
            _artifacts["high_miss_cols"] = _load_artifact("high_miss_cols.pkl")
        except FileNotFoundError:
            _artifacts["high_miss_cols"] = []
            logger.warning("high_miss_cols.pkl not found — assuming none")

        # ── New IOU-optimized artifacts (optional, backward-compatible) ──
        try:
            _artifacts["calibrators"] = _load_artifact("calibrators.pkl")
            logger.info("Loaded Platt calibrators")
        except FileNotFoundError:
            _artifacts["calibrators"] = None

        try:
            _artifacts["optimal_thresholds"] = _load_artifact("optimal_thresholds.pkl")
            logger.info(f"Loaded optimal thresholds: {_artifacts['optimal_thresholds']}")
        except FileNotFoundError:
            _artifacts["optimal_thresholds"] = None

        _loaded = True
        _log_artifact_info()
        return _artifacts

    except Exception as e:
        logger.error(f"Failed to load model artifacts: {e}")
        raise


def _log_artifact_info():
    """Log diagnostic info about loaded artifacts."""
    models = _artifacts.get("models")
    feature_cols = _artifacts.get("feature_cols", [])

    # Detect model type
    if isinstance(models, dict):
        logger.info(f"Loaded {len(models)} XGBoost model(s): {list(models.keys())}")
    elif isinstance(models, list):
        logger.info(f"Loaded {len(models)} XGBoost model(s) (list)")
    else:
        model_type = type(models).__name__
        logger.info(f"Loaded single model: {model_type}")

    logger.info(f"Feature columns: {len(feature_cols)} features")
    logger.info(f"Scaler type: {type(_artifacts.get('scaler')).__name__}")
    logger.info(f"Imputer type: {type(_artifacts.get('imputer')).__name__}")


def get_artifacts() -> Dict[str, Any]:
    """Get the loaded artifacts (loads on first call)."""
    if not _loaded:
        load_artifacts()
    return _artifacts


def get_feature_columns() -> List[str]:
    """Return the ordered list of feature column names the model expects."""
    arts = get_artifacts()
    return list(arts.get("feature_cols", []))


def get_calibrators() -> Optional[Dict[str, Any]]:
    """Return the Platt scaling calibrators (if available)."""
    arts = get_artifacts()
    return arts.get("calibrators")


def get_optimal_thresholds() -> Optional[Dict[str, float]]:
    """Return optimal alarm thresholds per horizon (if available)."""
    arts = get_artifacts()
    return arts.get("optimal_thresholds")


def is_loaded() -> bool:
    """Check if artifacts are loaded."""
    return _loaded
