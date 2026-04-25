"""
Chronos risk predictor — inference + SHAP explanations.

Takes a 77-feature dictionary (from the frontend simulation engine),
transforms it through the preprocessing pipeline (impute → scale),
runs XGBoost inference, and computes SHAP feature contributions.
"""

import logging
import numpy as np
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Lazy import shap — it's heavy and may not be installed in all envs
_shap_explainer = None


def predict(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run Chronos risk prediction on a feature vector.

    Args:
        features: dict with feature keys matching the simulation engine output
                  (hr, map_mean, sbp, ..., observed_hours_in_window)

    Returns:
        {
            "risk_scores": { "shock": 0.89, "sepsis": 0.72, ... },
            "aggregate_risk": 0.89,
            "shap_values": [ { "feature": "lactate", "value": 0.28, "direction": "risk" }, ... ],
            "raw_probability": 0.84,
            "per_horizon": { "2h": 0.45, "6h": 0.67, "12h": 0.84 },
            "calibrated": true
        }
    """
    from .loader import get_artifacts, get_feature_columns

    artifacts = get_artifacts()
    models = artifacts["models"]
    scaler = artifacts["scaler"]
    imputer = artifacts["imputer"]
    feature_cols = get_feature_columns()
    calibrators = artifacts.get("calibrators")

    # ── Feature Engineering (match training pipeline) ──
    features = _apply_feature_engineering(features)

    # ── Build feature vector in correct column order ──
    feature_vector = []
    for col in feature_cols:
        val = features.get(col)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            feature_vector.append(np.nan)
        else:
            feature_vector.append(float(val))

    import pandas as pd

    # ── Preprocessing: Build DataFrame to match imputer requirements ──
    df_raw = pd.DataFrame([feature_vector], columns=feature_cols)

    try:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            X_imputed = imputer.transform(df_raw)
            X_scaled = scaler.transform(X_imputed)
    except Exception as e:
        logger.warning(f"Preprocessing failed, using fallback: {e}")
        X_scaled = np.nan_to_num(np.array([feature_vector]), nan=0.0)
    
    # ── Append missingness indicators ──
    high_miss_cols = artifacts.get("high_miss_cols", [])
    if high_miss_cols:
        miss_vector = []
        for col in high_miss_cols:
            val = features.get(col)
            # Flag is 1 if missing or NaN, else 0
            if val is None or pd.isna(val):
                miss_vector.append(1.0)
            else:
                miss_vector.append(0.0)
        
        X_miss = np.array([miss_vector])
        X_final = np.hstack([X_scaled, X_miss])
    else:
        X_final = X_scaled

    # Reconstruct exact feature names list for DMatrix if needed
    fe_names = artifacts.get("feature_names_fe", [])
    if not fe_names:
        # Fallback approximation
        fe_names = feature_cols + [f"miss_{c}" for c in high_miss_cols]

    # ── Multi-Horizon Inference ──
    per_horizon = {}
    is_calibrated = False
    if isinstance(models, dict) and all(h in models for h in ['2h', '6h', '12h']):
        # Use per-horizon models directly
        for horizon in ['2h', '6h', '12h']:
            prob = _predict_single(models[horizon], X_final, fe_names)
            # Apply Platt calibration if available
            if calibrators and horizon in calibrators:
                try:
                    cal_prob = calibrators[horizon].predict_proba(X_final)[:, 1]
                    prob = float(cal_prob[0])
                    is_calibrated = True
                except Exception:
                    pass  # fall back to uncalibrated
            per_horizon[horizon] = round(prob, 4)
        raw_prob = per_horizon.get('12h', per_horizon.get(list(per_horizon.keys())[0]))
    else:
        # Single model or other format — use existing logic
        raw_prob = _run_inference(models, X_final, fe_names)
        per_horizon = {'12h': round(raw_prob, 4)}

    # ── Derive risk category scores ──
    risk_scores = _derive_risk_scores(raw_prob, features)

    # ── SHAP Explanations ──
    shap_values = _compute_shap(models, X_final, fe_names)

    aggregate = max(risk_scores.values())

    return {
        "risk_scores": risk_scores,
        "aggregate_risk": round(aggregate, 3),
        "shap_values": shap_values,
        "raw_probability": round(float(raw_prob), 4),
        "per_horizon": per_horizon,
        "calibrated": is_calibrated,
    }


def _run_inference(models: Any, X_scaled: np.ndarray, feature_cols: List[str]) -> float:
    """
    Run the XGBoost model(s) and return a risk probability.

    Handles multiple model formats:
    - Single XGBClassifier: calls predict_proba
    - Dict of models (e.g., {"2h": model, "6h": model, "12h": model}): averages
    - List of models: averages
    """
    try:
        if isinstance(models, dict):
            # Multi-horizon models — average the probabilities
            probs = []
            for name, model in models.items():
                prob = _predict_single(model, X_scaled, feature_cols)
                probs.append(prob)
                logger.debug(f"Model '{name}' prediction: {prob:.4f}")
            return float(np.mean(probs))

        elif isinstance(models, list):
            # Ensemble list — average
            probs = [_predict_single(m, X_scaled, feature_cols) for m in models]
            return float(np.mean(probs))

        else:
            # Single model
            return _predict_single(models, X_scaled, feature_cols)

    except Exception as e:
        logger.error(f"Inference failed: {e}")
        # Fallback: return a rule-based estimate from vitals
        return _fallback_risk_estimate(X_scaled, feature_cols)


def _predict_single(model: Any, X: np.ndarray, feature_cols: List[str]) -> float:
    """Get probability from a single model."""
    import xgboost as xgb

    if hasattr(model, "predict_proba"):
        # sklearn API
        proba = model.predict_proba(X)
        return float(proba[0][1]) if proba.shape[1] > 1 else float(proba[0][0])

    elif isinstance(model, xgb.Booster):
        # Native XGBoost API
        dmatrix = xgb.DMatrix(X, feature_names=feature_cols)
        pred = model.predict(dmatrix)
        return float(pred[0])

    else:
        # Try generic predict
        pred = model.predict(X)
        val = float(pred[0])
        # If it's already a probability (0–1), return as-is; otherwise sigmoid it
        if 0 <= val <= 1:
            return val
        return float(1 / (1 + np.exp(-val)))


def _derive_risk_scores(base_prob: float, features: Dict[str, Any]) -> Dict[str, float]:
    """
    Derive category-specific risk scores from the base mortality probability
    and the patient's current feature values.

    The base XGBoost model predicts overall ICU event risk. We modulate it
    with clinically-informed heuristics to produce per-category scores.
    """
    # Shock indicators
    shock_index = features.get("shock_index", 0.6) or 0.6
    map_val = features.get("map_mean", 75) or 75
    ne_dose = features.get("ne_equivalent_dose", 0) or 0
    vasopressor = features.get("vasopressor_active", 0) or 0

    shock_mod = 1.0
    if shock_index > 0.9:
        shock_mod += 0.15
    if map_val < 65:
        shock_mod += 0.10
    if vasopressor:
        shock_mod += 0.10
    if ne_dose > 0.1:
        shock_mod += 0.10

    # Sepsis indicators
    lactate = features.get("lactate", 1.0) or 1.0
    wbc = features.get("wbc", 8.0) or 8.0
    temp = features.get("temp_c", 37.0) or 37.0

    sepsis_mod = 1.0
    if lactate > 2.0:
        sepsis_mod += 0.12
    if lactate > 4.0:
        sepsis_mod += 0.15
    if wbc > 12 or wbc < 4:
        sepsis_mod += 0.08
    if temp > 38.5 or temp < 36.0:
        sepsis_mod += 0.08

    # Deterioration indicators
    sofa = features.get("sofa_approx", 0) or 0
    delta_sofa = features.get("delta_sofa_6h", 0) or 0

    deterioration_mod = 1.0
    if sofa >= 6:
        deterioration_mod += 0.12
    if delta_sofa >= 2:
        deterioration_mod += 0.15

    # Cardiac arrest indicators
    hr = features.get("hr", 80) or 80
    potassium = features.get("potassium", 4.0) or 4.0
    ph = features.get("ph_abg", 7.4) or 7.4

    arrest_mod = 0.8  # baseline lower than overall risk
    if hr > 130 or hr < 45:
        arrest_mod += 0.20
    if potassium > 6.0 or potassium < 2.5:
        arrest_mod += 0.20
    if ph < 7.2:
        arrest_mod += 0.15

    # Clamp all to [0.02, 0.99]
    clamp = lambda v: max(0.02, min(0.99, v))
    return {
        "shock": clamp(base_prob * shock_mod),
        "sepsis": clamp(base_prob * sepsis_mod),
        "deterioration": clamp(base_prob * deterioration_mod),
        "arrest": clamp(base_prob * arrest_mod),
    }


def _compute_shap(models: Any, X_scaled: np.ndarray, feature_cols: List[str]) -> List[Dict[str, Any]]:
    """
    Compute SHAP values for the prediction and return the top 6 contributors.

    Falls back to feature-importance-based approximation if SHAP is unavailable.
    """
    global _shap_explainer

    try:
        import shap

        # Get the model to explain
        model = models
        if isinstance(models, dict):
            # Use the first model for SHAP (typically "12h" horizon)
            model = list(models.values())[0]
        elif isinstance(models, list):
            model = models[0]

        if _shap_explainer is None:
            _shap_explainer = shap.TreeExplainer(model)

        sv = _shap_explainer.shap_values(X_scaled)

        # Handle multi-output: take class 1 (positive class)
        if isinstance(sv, list):
            sv = sv[1] if len(sv) > 1 else sv[0]

        # sv shape: (1, n_features)
        shap_vals = sv[0] if sv.ndim > 1 else sv

        # Build feature contributions
        contributions = []
        for i, col in enumerate(feature_cols):
            contributions.append({
                "feature": col,
                "value": round(float(shap_vals[i]), 4),
                "direction": "risk" if shap_vals[i] > 0 else "protective",
            })

        # Sort by absolute value, return top 6
        contributions.sort(key=lambda x: abs(x["value"]), reverse=True)
        return contributions[:6]

    except ImportError:
        logger.warning("shap not installed — using feature importance fallback")
        return _shap_fallback(models, X_scaled, feature_cols)

    except Exception as e:
        logger.warning(f"SHAP computation failed: {e}")
        return _shap_fallback(models, X_scaled, feature_cols)


def _shap_fallback(models: Any, X: np.ndarray, feature_cols: List[str]) -> List[Dict[str, Any]]:
    """
    Fallback when SHAP is unavailable: use XGBoost feature importances
    multiplied by feature values as a rough approximation.
    """
    try:
        model = models
        if isinstance(models, dict):
            model = list(models.values())[0]
        elif isinstance(models, list):
            model = models[0]

        # Get feature importances
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        elif hasattr(model, "get_score"):
            score_dict = model.get_score(importance_type="gain")
            # score_dict uses actual feature names instead of "f0", "f1"
            importances = np.array([score_dict.get(col, 0) for col in feature_cols])
            if importances.sum() > 0:
                importances = importances / importances.sum()
        else:
            # Uniform fallback
            importances = np.ones(len(feature_cols)) / len(feature_cols)

        # Weight importance by z-scored feature value
        vals = X[0]
        pseudo_shap = importances * vals

        contributions = []
        for i, col in enumerate(feature_cols):
            contributions.append({
                "feature": col,
                "value": round(float(pseudo_shap[i]), 4),
                "direction": "risk" if pseudo_shap[i] > 0 else "protective",
            })

        contributions.sort(key=lambda x: abs(x["value"]), reverse=True)
        return contributions[:6]

    except Exception as e:
        logger.warning(f"Feature importance fallback also failed: {e}")
        return []


def _fallback_risk_estimate(X: np.ndarray, feature_cols: List[str]) -> float:
    """
    Rule-based risk estimate when model inference fails entirely.
    Uses SOFA score as the primary driver.
    """
    try:
        idx_map = {col: i for i, col in enumerate(feature_cols)}
        sofa_idx = idx_map.get("sofa_approx")
        lactate_idx = idx_map.get("lactate")

        sofa = X[0][sofa_idx] if sofa_idx is not None else 2
        lactate = X[0][lactate_idx] if lactate_idx is not None else 1.0

        # Rough mortality estimate: SOFA → mortality curve
        # SOFA 0-6: ~10%, 7-9: ~15-30%, 10-12: ~40-50%, >12: ~60-90%
        risk = min(0.95, 0.05 + sofa * 0.06 + max(0, lactate - 2) * 0.05)
        return float(risk)

    except Exception:
        return 0.15  # safe default


def _apply_feature_engineering(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply the same feature engineering transforms used during training.
    Adds rate-of-change, interaction, and ratio features.
    
    Note: Rate-of-change features require previous values which may not
    be available for single-row prediction — they default to 0.0.
    """
    features = dict(features)  # copy to avoid mutation

    # Interaction features
    def _safe_mul(a, b):
        a = features.get(a, 0) or 0
        b = features.get(b, 0) or 0
        try:
            return float(a) * float(b)
        except (TypeError, ValueError):
            return 0.0

    features.setdefault('shock_x_vaso', _safe_mul('shock_index', 'vasopressor_active'))
    features.setdefault('lactate_x_sofa', _safe_mul('lactate', 'sofa_approx'))
    features.setdefault('map_x_ne', _safe_mul('map_mean', 'ne_equivalent_dose'))
    features.setdefault('hr_x_shock', _safe_mul('hr', 'shock_index'))

    # Ratio features
    try:
        hr = float(features.get('hr', 0) or 0)
        rr = float(features.get('rr', 0) or 0)
        features.setdefault('hr_rr_ratio', hr / rr if rr > 0 else np.nan)
    except (TypeError, ValueError):
        features.setdefault('hr_rr_ratio', np.nan)

    try:
        urine = float(features.get('urine_ml', 0) or 0)
        creat = float(features.get('creatinine', 0) or 0)
        features.setdefault('urine_creat_ratio', urine / creat if creat > 0 else np.nan)
    except (TypeError, ValueError):
        features.setdefault('urine_creat_ratio', np.nan)

    # Rate-of-change features default to 0 (no temporal context in single prediction)
    for feat in ['hr', 'map_mean', 'lactate', 'creatinine', 'sofa_approx']:
        features.setdefault(f'delta_{feat}_1h', 0.0)

    return features
