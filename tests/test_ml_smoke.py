"""Quick smoke test for the Chronos ML inference pipeline."""

import sys
import os

# Add backend to path so 'app.ml' resolves
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from app.ml.loader import load_artifacts, get_feature_columns
from app.ml.predictor import predict

print("=" * 60)
print("CHRONOS ML INFERENCE SMOKE TEST")
print("=" * 60)

# Step 1: Load artifacts
print("\n[1] Loading model artifacts...")
try:
    artifacts = load_artifacts()
    print(f"    [OK] Models loaded: {type(artifacts['models']).__name__}")
    if isinstance(artifacts['models'], dict):
        print(f"      Horizons: {list(artifacts['models'].keys())}")
    print(f"    [OK] Scaler: {type(artifacts['scaler']).__name__}")
    print(f"    [OK] Imputer: {type(artifacts['imputer']).__name__}")
    cols = get_feature_columns()
    print(f"    [OK] Feature columns: {len(cols)} features")
    print(f"    [OK] First 5: {cols[:5]}")
    # Report new artifacts
    if artifacts.get("calibrators"):
        print(f"    [OK] Calibrators loaded: {list(artifacts['calibrators'].keys())}")
    else:
        print(f"    [WARN] No calibrators found (uncalibrated mode)")
    if artifacts.get("optimal_thresholds"):
        print(f"    [OK] Optimal thresholds: {artifacts['optimal_thresholds']}")
    else:
        print(f"    [WARN] No optimal thresholds (using defaults)")
except Exception as e:
    print(f"    [FAIL] FAILED: {e}")
    sys.exit(1)

# Step 2: Build a test feature vector (critical patient P-1042 style)
print("\n[2] Building test feature vector...")
test_features = {
    "hr": 115, "map_mean": 55, "sbp": 88, "dbp": 42, "rr": 26,
    "spo2": 92.0, "temp_c": 39.1, "pulse_pressure": 46, "gcs_total": 13,
    "fio2_frac": 0.50, "pao2": 78, "paco2_abg": 35, "ph_abg": 7.25,
    "pf_ratio": 156, "sf_ratio": 184,
    "vent_active": 1, "vasopressor_active": 1, "ne_equivalent_dose": 0.25,
    "crrt_active": 0,
    "lactate": 5.8, "creatinine": 2.1, "platelets": 95,
    "bilirubin_total": 2.4, "wbc": 22.0,
    "sodium": 136, "potassium": 4.8, "bicarbonate": 14,
    "hemoglobin": 10.1, "glucose": 195,
    "urine_ml": 20, "urine_ml_per_kg": 0.26, "body_weight_kg": 78.3,
    "sofa_resp": 3, "sofa_coag": 2, "sofa_liver": 2, "sofa_renal": 2,
    "sofa_cardio": 4, "sofa_cns": 1, "sofa_approx": 14,
    "shock_index": 1.307, "delta_sofa_6h": 2,
    "ards_flag": 1, "aki_stage": 2, "aki_stage_creat": 2, "aki_stage_uo": 2,
    "hours_since_admission": 18, "hours_since_infection": None,
    "charlson_comorbidity_index": 2, "oasis": 44, "oasis_prob": 0.32,
    "sapsii": 52, "sapsii_prob": 0.42,
    "hr_mean_12h": 108, "hr_std_12h": 12.5, "map_min_12h": 48,
    "map_mean_12h": 58, "lactate_max_12h": 6.2, "creatinine_max_12h": 2.3,
    "platelets_min_12h": 88, "bilirubin_max_12h": 2.6,
    "urine_sum_12h": 180, "urine_per_kg_sum_12h": 2.3,
    "vasopressor_any_12h": 1, "ne_dose_mean_12h": 0.18,
    "vent_any_12h": 1, "sofa_max_12h": 14, "delta_sofa_mean_12h": 1.5,
    "aki_stage_max_12h": 2, "pf_ratio_min_12h": 142, "sf_ratio_min_12h": 170,
    "shock_index_max_12h": 1.35, "observed_hours_in_window": 12,
}
print(f"    [OK] Built {len(test_features)} features")

# Step 3: Run prediction
print("\n[3] Running inference...")
try:
    result = predict(test_features)
    print(f"    [OK] Raw probability: {result['raw_probability']}")
    print(f"    [OK] Aggregate risk:  {result['aggregate_risk']}")
    
    # Per-horizon scores (new)
    if 'per_horizon' in result:
        print(f"\n    Per-Horizon Risk Scores:")
        for h, prob in result['per_horizon'].items():
            bar = "|" * int(prob * 30) + "." * (30 - int(prob * 30))
            print(f"      {h:>4s}  {bar} {prob:.3f}")
        print(f"    Calibrated: {result.get('calibrated', False)}")

    print(f"\n    Risk Scores:")
    for k, v in result['risk_scores'].items():
        bar = "|" * int(v * 30) + "." * (30 - int(v * 30))
        print(f"      {k:15s} {bar} {v:.3f}")
    print(f"\n    SHAP Explanations (top {len(result['shap_values'])}):") 
    for s in result['shap_values']:
        direction = "[!RED] risk" if s['direction'] == 'risk' else "[!GREEN] protective"
        print(f"      {s['feature']:25s} {s['value']:+.4f}  ({direction})")
    print("\n" + "=" * 60)
    print("[OK]  SMOKE TEST PASSED — ML inference pipeline is working!")
    print("=" * 60)
except Exception as e:
    print(f"    [FAIL] PREDICTION FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
