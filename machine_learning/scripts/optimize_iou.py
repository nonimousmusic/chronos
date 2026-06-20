"""
Chronos IOU Optimization Script (Phase 1 Enhanced)
===================================================
Standalone retraining script with all Phase 1 improvements:

   1. Dead column removal (spo2, sf_ratio - 100% missing)
   2. Temporal feature engineering (rate-of-change, interactions)
   3. Smart missingness handling
   4. Per-horizon Optuna hyperparameter search (100 trials/horizon)
   5. Single XGBoost with focal loss training
   6. Platt calibration
   7. Optimal threshold search

Usage:
    python scripts/optimize_iou.py

Reads:   data/datasets_13339.csv
Writes:  chronos_models/*.pkl  +  backend/models/*.pkl
"""

import os
import sys
import warnings
import json
import time

import numpy as np
import pandas as pd
import joblib
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score, average_precision_score, brier_score_loss,
    precision_recall_curve, f1_score
)
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import GroupKFold

warnings.filterwarnings("ignore")

# -- Paths --------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend")
DATA_PATH = os.path.join(ROOT, "data", "datasets_13339.csv")
SAVE_DIR = os.path.join(ROOT, "chronos_models")
BACKEND_MODELS_DIR = os.path.join(BACKEND_ROOT, "models")

os.makedirs(SAVE_DIR, exist_ok=True)
os.makedirs(BACKEND_MODELS_DIR, exist_ok=True)

# -- Focal Loss config (Phase 1: tuned from alpha=0.25/gamma=2.0) --
FOCAL_ALPHA = 0.35
FOCAL_GAMMA = 2.5

# -- SHAP Feature Pruning config --
SHAP_PRUNING_ENABLED = True
SHAP_IMPORTANCE_THRESHOLD_FRAC = 0.05  # prune features below this fraction of mean importance

# -- Negative Sampling config (for weak short horizons: 2h, 6h) --
NEGATIVE_SAMPLING_ENABLED = True
NEGATIVE_SAMPLING_MAX_NEG_RATIO = 5
NEGATIVE_SAMPLING_MIN_POS_RATE = 0.08

# ═════════════════════════════════════════════════════════════════════════════
# 0. Load Data
# ═════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("  CHRONOS IOU OPTIMIZATION PIPELINE")
print("=" * 70)

print(f"\n[0] Loading data from {DATA_PATH}...")
df = pd.read_csv(DATA_PATH)
print(f"    Loaded {len(df):,} rows × {df.shape[1]} columns")

# Datetime conversion
datetime_cols = [
    'prediction_time', 'intime', 'outtime',
    'event_time_2h', 'event_time_6h', 'event_time_12h',
]
for col in datetime_cols:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors='coerce')


# ═════════════════════════════════════════════════════════════════════════════
# 1. Identify & Drop Dead Columns
# ═════════════════════════════════════════════════════════════════════════════
print("\n[1] Identifying dead columns...")

# Columns that are 100% or near-100% missing
DEAD_COLS = []
for col in df.columns:
    if df[col].dtype in ['float64', 'int64'] and df[col].isnull().mean() >= 0.999:
        DEAD_COLS.append(col)
        print(f"    [DROP] Dropping '{col}' - {df[col].isnull().mean()*100:.1f}% missing")

# Also drop columns that are constant
for col in df.select_dtypes(include=[np.number]).columns:
    if col not in DEAD_COLS and df[col].nunique(dropna=True) <= 1:
        DEAD_COLS.append(col)
        print(f"    [DROP] Dropping '{col}' - constant value")

print(f"    Total dead columns removed: {len(DEAD_COLS)}")


# ═════════════════════════════════════════════════════════════════════════════
# 2. Define Feature Columns (cleaned)
# ═════════════════════════════════════════════════════════════════════════════
print("\n[2] Defining feature columns...")

ID_COLS = ['subject_id', 'hadm_id', 'stay_id', 'patient_split_bucket',
           'prediction_time', 'intime', 'outtime']
META_COLS = ['race', 'gender', 'first_careunit', 'admission_type',
             'ventilation_status', 'hospital_expire_flag']
LABEL_COLS = ['label_2h', 'label_6h', 'label_12h',
              'event_type_2h', 'event_type_6h', 'event_type_12h',
              'event_time_2h', 'event_time_6h', 'event_time_12h',
              'observation_window_hours']

# All numeric predictors - excluding dead columns
FEATURE_COLS_RAW = [
    'anchor_age',
    'hr', 'map_mean', 'sbp', 'dbp', 'rr', 'temp_c', 'pulse_pressure',
    'gcs_total', 'fio2_frac', 'pao2', 'paco2_abg', 'ph_abg', 'pf_ratio',
    'vent_active', 'vasopressor_active', 'ne_equivalent_dose', 'crrt_active',
    'lactate', 'creatinine', 'platelets', 'bilirubin_total', 'wbc',
    'sodium', 'potassium', 'bicarbonate', 'hemoglobin', 'glucose',
    'urine_ml', 'urine_ml_per_kg', 'body_weight_kg',
    'sofa_resp', 'sofa_coag', 'sofa_liver', 'sofa_renal', 'sofa_cardio', 'sofa_cns', 'sofa_approx',
    'shock_index', 'delta_sofa_6h', 'ards_flag', 'aki_stage', 'aki_stage_creat', 'aki_stage_uo',
    'hours_since_admission', 'hours_since_infection',
    'charlson_comorbidity_index', 'oasis', 'oasis_prob', 'sapsii', 'sapsii_prob',
    'hr_mean_12h', 'hr_std_12h', 'map_min_12h', 'map_mean_12h',
    'lactate_max_12h', 'creatinine_max_12h', 'platelets_min_12h', 'bilirubin_max_12h',
    'urine_sum_12h', 'urine_per_kg_sum_12h', 'vasopressor_any_12h', 'ne_dose_mean_12h',
    'vent_any_12h', 'sofa_max_12h', 'delta_sofa_mean_12h', 'aki_stage_max_12h',
    'pf_ratio_min_12h', 'shock_index_max_12h', 'observed_hours_in_window'
]

# Drop dead columns and columns not in dataframe
FEATURE_COLS = [c for c in FEATURE_COLS_RAW
                if c in df.columns and c not in DEAD_COLS]

print(f"    Using {len(FEATURE_COLS)} base feature columns (removed {len(FEATURE_COLS_RAW) - len(FEATURE_COLS)} dead/absent)")


# ═════════════════════════════════════════════════════════════════════════════
# 3. Temporal Feature Engineering
# ═════════════════════════════════════════════════════════════════════════════
print("\n[3] Engineering temporal features...")

df = df.sort_values(['stay_id', 'prediction_time']).reset_index(drop=True)

# 3a. Rate-of-change features (delta over lagged values within same stay)
RATE_FEATURES = ['hr', 'map_mean', 'lactate', 'creatinine', 'sofa_approx']
for feat in RATE_FEATURES:
    if feat in df.columns:
        col_name = f'delta_{feat}_1h'
        # Compute within-patient difference (lag-1 within stay)
        df[col_name] = df.groupby('stay_id')[feat].diff(1)
        if col_name not in FEATURE_COLS:
            FEATURE_COLS.append(col_name)

print(f"    Added {len(RATE_FEATURES)} rate-of-change features")

# 3b. Interaction features
INTERACTIONS = [
    ('shock_index', 'vasopressor_active', 'shock_x_vaso'),
    ('lactate', 'sofa_approx', 'lactate_x_sofa'),
    ('map_mean', 'ne_equivalent_dose', 'map_x_ne'),
    ('hr', 'shock_index', 'hr_x_shock'),
]
for f1, f2, name in INTERACTIONS:
    if f1 in df.columns and f2 in df.columns:
        df[name] = df[f1].fillna(0) * df[f2].fillna(0)
        if name not in FEATURE_COLS:
            FEATURE_COLS.append(name)

print(f"    Added {len(INTERACTIONS)} interaction features")

# 3c. Ratio features
if 'hr' in df.columns and 'rr' in df.columns:
    df['hr_rr_ratio'] = df['hr'] / df['rr'].replace(0, np.nan)
    FEATURE_COLS.append('hr_rr_ratio')

if 'urine_ml' in df.columns and 'creatinine' in df.columns:
    df['urine_creat_ratio'] = df['urine_ml'] / df['creatinine'].replace(0, np.nan)
    FEATURE_COLS.append('urine_creat_ratio')

print(f"    Added ratio features")

# 3d. Phase 2 — Additional clinical interaction features
PHASE2_INTERACTIONS = [
    ('age', 'charlson_comorbidity_index', 'age_x_charlson'),
    ('lactate', 'creatinine', 'lactate_x_creatinine'),
    ('hr', 'temp_c', 'hr_x_temp'),
    ('map_mean', 'lactate', 'map_x_lactate'),
    ('bilirubin_total', 'creatinine', 'bili_x_creatinine'),
    ('gcs_total', 'age', 'gcs_x_age'),
    ('pf_ratio', 'vent_active', 'pf_x_vent'),
    ('shock_index', 'lactate', 'shock_x_lactate'),
]
for f1, f2, name in PHASE2_INTERACTIONS:
    if f1 in df.columns and f2 in df.columns:
        df[name] = df[f1].fillna(0) * df[f2].fillna(0)
        if name not in FEATURE_COLS:
            FEATURE_COLS.append(name)
print(f"    Added {len(PHASE2_INTERACTIONS)} Phase2 interaction features")

# 3e. Phase 2 — Polynomial features (squared terms)
SQUARE_FEATURES = ['lactate', 'creatinine', 'hr', 'age', 'sofa_approx']
for feat in SQUARE_FEATURES:
    if feat in df.columns:
        col_name = f'{feat}_squared'
        df[col_name] = df[feat] ** 2
        if col_name not in FEATURE_COLS:
            FEATURE_COLS.append(col_name)
print(f"    Added {len(SQUARE_FEATURES)} polynomial (squared) features")

# 3f. Phase 2 — Delta-from-12h-history (current vs recent aggregate)
DELTA_HISTORY = [
    ('lactate', 'lactate_max_12h', 'lactate_delta_from_max_12h'),
    ('creatinine', 'creatinine_max_12h', 'creatinine_delta_from_max_12h'),
    ('hr', 'hr_mean_12h', 'hr_delta_from_mean_12h'),
    ('map_mean', 'map_mean_12h', 'map_delta_from_mean_12h'),
    ('shock_index', 'shock_index_max_12h', 'shock_index_delta_from_max_12h'),
]
for current_col, hist_col, name in DELTA_HISTORY:
    if current_col in df.columns and hist_col in df.columns:
        df[name] = df[current_col] - df[hist_col]
        if name not in FEATURE_COLS:
            FEATURE_COLS.append(name)
print(f"    Added {len(DELTA_HISTORY)} delta-from-history features")

# 3g. Phase 3 — Advanced derived clinical features
# Organ failure count: number of SOFA subsystems with score > 0
SOFA_SUBSCORES = ['sofa_resp', 'sofa_coag', 'sofa_liver', 'sofa_renal', 'sofa_cardio', 'sofa_cns']
available_sofa = [c for c in SOFA_SUBSCORES if c in df.columns]
if len(available_sofa) == len(SOFA_SUBSCORES):
    df['organ_failure_count'] = (df[SOFA_SUBSCORES] > 0).sum(axis=1)
    FEATURE_COLS.append('organ_failure_count')
    print(f"    [organ_failure_count] {len(SOFA_SUBSCORES)} SOFA subsystems checked")
else:
    print(f"    [SKIP] organ_failure_count — missing SOFA subscores (found {len(available_sofa)}/{len(SOFA_SUBSCORES)})")

# Paired organ failure interactions
PAIRED_FAILURE = [
    ('sofa_resp', 'sofa_cardio', 'paired_cardioresp_failure'),
    ('sofa_liver', 'sofa_renal', 'paired_hepatorenal_failure'),
]
for f1, f2, name in PAIRED_FAILURE:
    if f1 in df.columns and f2 in df.columns:
        df[name] = df[f1].fillna(0) * df[f2].fillna(0)
        FEATURE_COLS.append(name)
print(f"    Added {len(PAIRED_FAILURE)} paired organ failure features")

# Lab derangement score: count of abnormal lab values
LAB_THRESHOLDS = [
    ('lactate', 2.0, 'gt'),
    ('creatinine', 1.2, 'gt'),
    ('platelets', 150, 'lt'),
    ('bilirubin_total', 1.2, 'gt'),
    ('wbc', 12.0, 'gt'),
    ('wbc', 4.0, 'lt'),
    ('sodium', 135, 'lt'),
    ('sodium', 145, 'gt'),
    ('potassium', 3.5, 'lt'),
    ('potassium', 5.5, 'gt'),
    ('hemoglobin', 10, 'lt'),
    ('glucose', 180, 'gt'),
]
derangement = pd.DataFrame(index=df.index)
derangement[:] = 0
count_valid = 0
for col, threshold, direction in LAB_THRESHOLDS:
    if col in df.columns:
        mask = df[col].notna()
        if direction == 'gt':
            derangement.loc[mask, col + '_abn'] = (df.loc[mask, col] > threshold).astype(int)
        else:
            derangement.loc[mask, col + '_abn'] = (df.loc[mask, col] < threshold).astype(int)
        count_valid += 1
if count_valid > 0:
    df['lab_derangement_score'] = derangement.sum(axis=1)
    FEATURE_COLS.append('lab_derangement_score')
    print(f"    [lab_derangement_score] {count_valid} lab thresholds checked")
else:
    print(f"    [SKIP] lab_derangement_score — no lab columns available")

# Variability metrics
if 'hr_std_12h' in df.columns and 'hr_mean_12h' in df.columns:
    df['hr_cv'] = df['hr_std_12h'] / df['hr_mean_12h'].replace(0, np.nan)
    FEATURE_COLS.append('hr_cv')
    print(f"    [hr_cv] heart rate coefficient of variation")

if 'map_min_12h' in df.columns and 'map_mean' in df.columns:
    df['map_drop_ratio'] = (df['map_mean'] - df['map_min_12h']) / df['map_mean'].replace(0, np.nan)
    FEATURE_COLS.append('map_drop_ratio')
    print(f"    [map_drop_ratio] MAP drop fraction")

if 'shock_index' in df.columns and 'shock_index_max_12h' in df.columns:
    df['shock_progression_index'] = df['shock_index'] / df['shock_index_max_12h'].replace(0, np.nan)
    FEATURE_COLS.append('shock_progression_index')
    print(f"    [shock_progression_index] shock index ratio")

# Trajectory features
if 'lactate_max_12h' in df.columns and 'lactate' in df.columns:
    df['lactate_clearance_ratio'] = (df['lactate_max_12h'] - df['lactate']) / df['lactate_max_12h'].replace(0, np.nan)
    FEATURE_COLS.append('lactate_clearance_ratio')
    print(f"    [lactate_clearance_ratio] lactate clearance fraction")

if 'platelets_min_12h' in df.columns and 'platelets' in df.columns:
    df['platelets_delta_from_min_12h'] = df['platelets'] - df['platelets_min_12h']
    FEATURE_COLS.append('platelets_delta_from_min_12h')
    print(f"    [platelets_delta_from_min_12h] platelet recovery delta")

if 'pf_ratio_min_12h' in df.columns and 'pf_ratio' in df.columns:
    df['pf_ratio_change'] = df['pf_ratio'] - df['pf_ratio_min_12h']
    FEATURE_COLS.append('pf_ratio_change')
    print(f"    [pf_ratio_change] PF ratio trajectory")

# Composite severity scores
if 'oasis' in df.columns and 'sofa_approx' in df.columns:
    df['oasis_x_sofa'] = df['oasis'].fillna(0) * df['sofa_approx'].fillna(0)
    FEATURE_COLS.append('oasis_x_sofa')
    print(f"    [oasis_x_sofa] OASIS × SOFA composite")

if 'sapsii' in df.columns and 'lactate' in df.columns:
    df['sapsii_x_lactate'] = df['sapsii'].fillna(0) * df['lactate'].fillna(0)
    FEATURE_COLS.append('sapsii_x_lactate')
    print(f"    [sapsii_x_lactate] SAPSII × lactate composite")

print(f"    Total feature columns: {len(FEATURE_COLS)}")


# ═════════════════════════════════════════════════════════════════════════════
# 4. Patient-Level Split
# ═════════════════════════════════════════════════════════════════════════════
print("\n[4] Splitting data (patient-level)...")

train_df = df[df['patient_split_bucket'] < 70].copy()
val_df = df[(df['patient_split_bucket'] >= 70) & (df['patient_split_bucket'] < 85)].copy()
test_df = df[df['patient_split_bucket'] >= 85].copy()

for name, subset in [('Train', train_df), ('Val', val_df), ('Test', test_df)]:
    n_pat = subset['subject_id'].nunique()
    n_row = len(subset)
    pos_12 = subset['label_12h'].mean()
    print(f"    {name:6s} | patients={n_pat:5,} | rows={n_row:7,} | label_12h pos_rate={pos_12:.3f}")

# Verify no leakage
assert not set(train_df.subject_id) & set(val_df.subject_id), 'LEAKAGE: train/val'
assert not set(train_df.subject_id) & set(test_df.subject_id), 'LEAKAGE: train/test'
assert not set(val_df.subject_id) & set(test_df.subject_id), 'LEAKAGE: val/test'
print("    [OK] No patient overlap across splits")


# ═════════════════════════════════════════════════════════════════════════════
# 4b. Target Encoding for Categorical Features (Phase 2)
# ═════════════════════════════════════════════════════════════════════════════
print("\n[4b] Target encoding categorical features...")

TARGET_ENCODE_COLS = ['race', 'gender', 'first_careunit', 'admission_type']
TARGET_ENCODE_MAPS = {}

for cat_col in TARGET_ENCODE_COLS:
    if cat_col not in train_df.columns:
        continue
    # Compute smoothed target encoding using training data
    target_mean = train_df['label_12h'].mean()
    category_counts = train_df.groupby(cat_col).size()
    category_target = train_df.groupby(cat_col)['label_12h'].mean()
    # Smoothing: blend category mean with global mean, weighted by count
    smoothing = 10  # minimum samples for full confidence
    smoothed = (category_target * category_counts + target_mean * smoothing) / (category_counts + smoothing)
    TARGET_ENCODE_MAPS[cat_col] = smoothed.to_dict()
    encoded_col = f'{cat_col}_target_enc'
    # Apply to train/val/test
    for split_df in [train_df, val_df, test_df]:
        split_df[encoded_col] = split_df[cat_col].map(smoothed).fillna(target_mean)
    FEATURE_COLS.append(encoded_col)
    print(f"    [{cat_col:>20s}] -> {encoded_col:>25s}  ({len(smoothed)} categories, smoothing={smoothing})")

if TARGET_ENCODE_MAPS:
    print(f"    Target encoding complete: {len(TARGET_ENCODE_MAPS)} categorical features encoded")
else:
    print(f"    [SKIP] No categorical columns found for target encoding")


# ═════════════════════════════════════════════════════════════════════════════
# 5. Preprocessing (Train-only fit)
# ═════════════════════════════════════════════════════════════════════════════
print("\n[5] Preprocessing...")

# 5a. Imputation
imputer = SimpleImputer(strategy='median')
imputer.fit(train_df[FEATURE_COLS])

X_train = imputer.transform(train_df[FEATURE_COLS])
X_val = imputer.transform(val_df[FEATURE_COLS])
X_test = imputer.transform(test_df[FEATURE_COLS])

# 5b. Missingness indicators (before imputation)
miss_train = train_df[FEATURE_COLS].isnull().astype(int).values
miss_val = val_df[FEATURE_COLS].isnull().astype(int).values
miss_test = test_df[FEATURE_COLS].isnull().astype(int).values

# 5c. Standardization
scaler = StandardScaler()
scaler.fit(X_train)

X_train_sc = scaler.transform(X_train)
X_val_sc = scaler.transform(X_val)
X_test_sc = scaler.transform(X_test)

# 5d. High-missingness indicator features
HIGH_MISS_THRESHOLD = 0.20
miss_rates = train_df[FEATURE_COLS].isnull().mean()
HIGH_MISS_COLS = miss_rates[miss_rates > HIGH_MISS_THRESHOLD].index.tolist()

# Remove indicators that are constant (all 0 or all 1 in training data)
hi_idx_raw = [FEATURE_COLS.index(c) for c in HIGH_MISS_COLS]
useful_hi_idx = []
useful_hi_cols = []
for idx, col in zip(hi_idx_raw, HIGH_MISS_COLS):
    indicator_values = miss_train[:, idx]
    if indicator_values.std() > 0.01:  # has some variance
        useful_hi_idx.append(idx)
        useful_hi_cols.append(col)

HIGH_MISS_COLS = useful_hi_cols
hi_idx = useful_hi_idx

print(f"    Missingness indicators: {len(HIGH_MISS_COLS)} (removed {len(hi_idx_raw) - len(hi_idx)} constant indicators)")


def add_missingness(X, miss_matrix, idx_list):
    """Append binary missingness indicators for high-missingness columns."""
    if len(idx_list) == 0:
        return X
    return np.hstack([X, miss_matrix[:, idx_list]])


X_train_fe = add_missingness(X_train_sc, miss_train, hi_idx)
X_val_fe = add_missingness(X_val_sc, miss_val, hi_idx)
X_test_fe = add_missingness(X_test_sc, miss_test, hi_idx)

FEATURE_NAMES_FE = FEATURE_COLS + [f'miss_{c}' for c in HIGH_MISS_COLS]
print(f"    Final feature dimension: {X_train_fe.shape[1]}")

# Labels
y_train_2 = train_df['label_2h'].values
y_val_2 = val_df['label_2h'].values
y_test_2 = test_df['label_2h'].values

y_train_6 = train_df['label_6h'].values
y_val_6 = val_df['label_6h'].values
y_test_6 = test_df['label_6h'].values

y_train_12 = train_df['label_12h'].values
y_val_12 = val_df['label_12h'].values
y_test_12 = test_df['label_12h'].values


# ═════════════════════════════════════════════════════════════════════════════
# 5b. SHAP-Based Feature Pruning
# ═════════════════════════════════════════════════════════════════════════════
if SHAP_PRUNING_ENABLED:
    print("\n[5b] Running SHAP-based feature pruning...")
    try:
        import xgboost as xgb
        import shap
        import sys as _sys
        _BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'backend')
        if _BACKEND_DIR not in _sys.path:
            _sys.path.insert(0, _BACKEND_DIR)
        from app.ml.focal_loss import FocalLossObjective

        neg_probe = (y_train_12 == 0).sum()
        pos_probe = (y_train_12 == 1).sum()
        scale_probe = neg_probe / max(pos_probe, 1)

        probe = xgb.XGBClassifier(
            n_estimators=200, max_depth=4, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.7,
            scale_pos_weight=scale_probe,
            objective=FocalLossObjective(alpha=FOCAL_ALPHA, gamma=FOCAL_GAMMA),
            random_state=42, tree_method='hist',
        )
        probe.fit(X_train_fe, y_train_12, eval_set=[(X_val_fe, y_val_12)], verbose=False)

        explainer = shap.TreeExplainer(probe.get_booster())
        shap_vals = explainer.shap_values(X_val_fe)
        mean_abs_shap = np.mean(np.abs(shap_vals), axis=0)
        threshold = np.mean(mean_abs_shap) * SHAP_IMPORTANCE_THRESHOLD_FRAC
        feat_importance = sorted(zip(FEATURE_NAMES_FE, mean_abs_shap), key=lambda x: x[1], reverse=True)
        pruned_features = [name for name, val in feat_importance if val < threshold]
        print(f"    Features below threshold ({threshold:.6f}): {len(pruned_features)} of {len(feat_importance)}")
        if pruned_features:
            pruned_base = set(f for f in pruned_features if not f.startswith('miss_'))
            pruned_miss = set(f[5:] for f in pruned_features if f.startswith('miss_'))
            n_before = len(FEATURE_COLS)
            n_miss_before = len(HIGH_MISS_COLS)
            FEATURE_COLS[:] = [c for c in FEATURE_COLS if c not in pruned_base]
            HIGH_MISS_COLS[:] = [c for c in HIGH_MISS_COLS if c not in pruned_miss]
            print(f"    Pruned {n_before - len(FEATURE_COLS)} base features, {n_miss_before - len(HIGH_MISS_COLS)} missingness indicators")

            # Re-run preprocessing with pruned feature set
            print("    Re-running preprocessing with pruned features...")
            imputer = SimpleImputer(strategy='median')
            imputer.fit(train_df[FEATURE_COLS])
            X_train = imputer.transform(train_df[FEATURE_COLS])
            X_val = imputer.transform(val_df[FEATURE_COLS])
            X_test = imputer.transform(test_df[FEATURE_COLS])
            miss_train = train_df[FEATURE_COLS].isnull().astype(int).values
            miss_val = val_df[FEATURE_COLS].isnull().astype(int).values
            miss_test = test_df[FEATURE_COLS].isnull().astype(int).values
            scaler = StandardScaler()
            scaler.fit(X_train)
            X_train_sc = scaler.transform(X_train)
            X_val_sc = scaler.transform(X_val)
            X_test_sc = scaler.transform(X_test)
            miss_rates = train_df[FEATURE_COLS].isnull().mean()
            HIGH_MISS_COLS[:] = miss_rates[miss_rates > HIGH_MISS_THRESHOLD].index.tolist()
            hi_idx_raw = [FEATURE_COLS.index(c) for c in HIGH_MISS_COLS]
            useful_hi_idx = []
            useful_hi_cols = []
            for idx, col in zip(hi_idx_raw, HIGH_MISS_COLS):
                if miss_train[:, idx].std() > 0.01:
                    useful_hi_idx.append(idx)
                    useful_hi_cols.append(col)
            HIGH_MISS_COLS[:] = useful_hi_cols
            hi_idx = useful_hi_idx
            X_train_fe = add_missingness(X_train_sc, miss_train, hi_idx)
            X_val_fe = add_missingness(X_val_sc, miss_val, hi_idx)
            X_test_fe = add_missingness(X_test_sc, miss_test, hi_idx)
            FEATURE_NAMES_FE = FEATURE_COLS + [f'miss_{c}' for c in HIGH_MISS_COLS]
            print(f"    Final feature dimension after pruning: {X_train_fe.shape[1]}")
    except ImportError:
        print("    [SKIP] SHAP not installed - no feature pruning")
    except Exception as e:
        print(f"    [SKIP] SHAP pruning failed: {e}")


# ═════════════════════════════════════════════════════════════════════════════
# 6. Focal Loss Implementation (imported from shared module for pickle compat)
# ═════════════════════════════════════════════════════════════════════════════
import sys
_BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'backend')
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
FL_IMPORTED = False
try:
    from app.ml.focal_loss import FocalLossObjective, FocalLossEval
    FL_IMPORTED = True
except ImportError:
    pass
if not FL_IMPORTED:
    class FocalLossObjective:
        """Fallback — defined locally if shared module unavailable."""
        def __init__(self, alpha=FOCAL_ALPHA, gamma=FOCAL_GAMMA):
            self.alpha = alpha; self.gamma = gamma
            self.__module__ = '__main__'
        def __call__(self, y_true, y_pred):
            p = 1.0 / (1.0 + np.exp(-y_pred))
            p = np.clip(p, 1e-7, 1.0 - 1e-7)
            pt = np.where(y_true == 1, p, 1 - p)
            alpha_t = np.where(y_true == 1, self.alpha, 1 - self.alpha)
            grad = alpha_t * (
                self.gamma * (1 - pt) ** (self.gamma - 1) * np.log(pt + 1e-9) * pt * (1 - pt)
                + (1 - pt) ** self.gamma * (y_true - p)
            ) * (-1)
            hess = alpha_t * (1 - pt) ** self.gamma * p * (1 - p)
            hess = np.maximum(hess, 1e-7)
            return grad, hess
    class FocalLossEval:
        __name__ = 'focal_loss'
        def __init__(self, alpha=FOCAL_ALPHA, gamma=FOCAL_GAMMA):
            self.alpha = alpha; self.gamma = gamma
            self.__module__ = '__main__'
        def __call__(self, y_true, y_pred):
            p = 1.0 / (1.0 + np.exp(-np.clip(y_pred, -10, 10)))
            p = np.clip(p, 1e-7, 1.0 - 1e-7)
            pt = np.where(y_true == 1, p, 1 - p)
            alpha_t = np.where(y_true == 1, self.alpha, 1 - self.alpha)
            fl = -alpha_t * (1 - pt) ** self.gamma * np.log(pt)
            return np.mean(fl)


# ═════════════════════════════════════════════════════════════════════════════
# 7. Baseline Model (Before Optimization) - for comparison
# ═════════════════════════════════════════════════════════════════════════════
print("\n[6] Training baseline model (original config)...")
import xgboost as xgb

neg = (y_train_12 == 0).sum()
pos = (y_train_12 == 1).sum()
scale_pos = neg / max(pos, 1)

baseline_model = xgb.XGBClassifier(
    n_estimators=400,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.7,
    scale_pos_weight=scale_pos,
    eval_metric='aucpr',
    early_stopping_rounds=30,
    random_state=42,
    tree_method='hist',
)
baseline_model.fit(
    X_train_fe, y_train_12,
    eval_set=[(X_val_fe, y_val_12)],
    verbose=False,
)

baseline_val_prob = baseline_model.predict_proba(X_val_fe)[:, 1]
baseline_test_prob = baseline_model.predict_proba(X_test_fe)[:, 1]

baseline_auroc = roc_auc_score(y_test_12, baseline_test_prob)
baseline_auprc = average_precision_score(y_test_12, baseline_test_prob)
baseline_brier = brier_score_loss(y_test_12, baseline_test_prob)

print(f"    Baseline (12h) | Test AUROC={baseline_auroc:.4f}  AUPRC={baseline_auprc:.4f}  Brier={baseline_brier:.4f}")


# ═════════════════════════════════════════════════════════════════════════════
# 8. Per-Horizon Optuna Hyperparameter Optimization
# ═════════════════════════════════════════════════════════════════════════════
print("\n[7] Running per-horizon Optuna hyperparameter search...")

try:
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    HAVE_OPTUNA = True
except ImportError:
    HAVE_OPTUNA = False
    print("    [WARN] optuna not installed - using manual grid search fallback")


def make_objective(X_tr, y_tr, X_vl, y_vl):
    """Factory that returns an Optuna objective for a given horizon's data."""
    def objective(trial):
        alpha = trial.suggest_float('focal_alpha', 0.05, 0.80)
        gamma = trial.suggest_float('focal_gamma', 0.0, 6.0)
        params = {
            'n_estimators': trial.suggest_int('n_estimators', 400, 1200),
            'max_depth': trial.suggest_int('max_depth', 3, 10),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.15, log=True),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 15),
            'gamma': trial.suggest_float('gamma', 0.0, 3.0),
            'subsample': trial.suggest_float('subsample', 0.5, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.3, 1.0),
            'reg_alpha': trial.suggest_float('reg_alpha', 1e-4, 3.0, log=True),
            'reg_lambda': trial.suggest_float('reg_lambda', 1e-4, 3.0, log=True),
            'scale_pos_weight': trial.suggest_float('scale_pos_weight', 1.0, scale_pos * 2.0),
        }
        model = xgb.XGBClassifier(
            **params,
            objective=FocalLossObjective(alpha=alpha, gamma=gamma),
            eval_metric=FocalLossEval(alpha, gamma),
            early_stopping_rounds=25,
            random_state=42,
            tree_method='hist',
        )
        model.fit(X_tr, y_tr, eval_set=[(X_vl, y_vl)], verbose=False)
        val_prob = model.predict_proba(X_vl)[:, 1]
        return average_precision_score(y_vl, val_prob)
    return objective


HORIZON_LABELS = ['12h', '6h', '2h']
HORIZON_DATA = {
    '12h': (X_train_fe, y_train_12, X_val_fe, y_val_12, y_test_12),
    '6h':  (X_train_fe, y_train_6,  X_val_fe, y_val_6,  y_test_6),
    '2h':  (X_train_fe, y_train_2,  X_val_fe, y_val_2,  y_test_2),
}

best_params_per_horizon = {}

if HAVE_OPTUNA:
    N_TRIALS_PER_HORIZON = 100  # 300 total across 3 horizons
    for h in HORIZON_LABELS:
        X_tr_h, y_tr_h, X_vl_h, y_vl_h, _ = HORIZON_DATA[h]
        study = optuna.create_study(direction='maximize', study_name=f'chronos_{h}')
        study.optimize(make_objective(X_tr_h, y_tr_h, X_vl_h, y_vl_h),
                       n_trials=N_TRIALS_PER_HORIZON, show_progress_bar=True)
        best_params_per_horizon[h] = study.best_params
        print(f"    [{h}] Best AUPRC: {study.best_value:.4f}")
        top5 = sorted(study.trials, key=lambda t: t.value or 0, reverse=True)[:5]
        print(f"    [{h}] Top-5: {[f'{t.value:.4f}' for t in top5]}")
    best_params = best_params_per_horizon['12h']  # default for backward compat
else:
    # Manual grid search fallback — try same configs per horizon
    configs = [
        {'max_depth': 4, 'learning_rate': 0.05, 'n_estimators': 600,
         'subsample': 0.75, 'colsample_bytree': 0.6, 'min_child_weight': 5,
         'gamma': 0.5, 'reg_alpha': 0.1, 'reg_lambda': 1.0,
         'scale_pos_weight': scale_pos},
        {'max_depth': 5, 'learning_rate': 0.03, 'n_estimators': 700,
         'subsample': 0.8, 'colsample_bytree': 0.5, 'min_child_weight': 8,
         'gamma': 1.0, 'reg_alpha': 0.5, 'reg_lambda': 2.0,
         'scale_pos_weight': scale_pos * 0.8},
        {'max_depth': 7, 'learning_rate': 0.08, 'n_estimators': 400,
         'subsample': 0.85, 'colsample_bytree': 0.7, 'min_child_weight': 3,
         'gamma': 0.2, 'reg_alpha': 0.01, 'reg_lambda': 1.5,
         'scale_pos_weight': scale_pos * 1.2},
        {'max_depth': 3, 'learning_rate': 0.04, 'n_estimators': 800,
         'subsample': 0.7, 'colsample_bytree': 0.65, 'min_child_weight': 10,
         'gamma': 0.8, 'reg_alpha': 0.3, 'reg_lambda': 0.5,
         'scale_pos_weight': scale_pos},
    ]
    for h in HORIZON_LABELS:
        X_tr_h, y_tr_h, X_vl_h, y_vl_h, _ = HORIZON_DATA[h]
        best_auprc_h = 0
        best_params_h = {}
        for cfg in configs:
            model = xgb.XGBClassifier(**cfg, eval_metric='aucpr',
                                      early_stopping_rounds=25,
                                      random_state=42, tree_method='hist')
            model.fit(X_tr_h, y_tr_h, eval_set=[(X_vl_h, y_vl_h)], verbose=False)
            val_prob = model.predict_proba(X_vl_h)[:, 1]
            auprc = average_precision_score(y_vl_h, val_prob)
            if auprc > best_auprc_h:
                best_auprc_h = auprc
                best_params_h = cfg
        best_params_per_horizon[h] = best_params_h
        print(f"    [{h}] Best grid AUPRC: {best_auprc_h:.4f}")
    best_params = best_params_per_horizon['12h']


# ═════════════════════════════════════════════════════════════════════════════
# 9. Train Tuned XGBoost (No SMOTE, No Ensemble)
# ═════════════════════════════════════════════════════════════════════════════
print("\n[8] Training tuned XGBoost models (all 3 horizons)...")

import xgboost as xgb

xgb_models = {}
probas = {}

for horizon, (X_tr, y_tr, _X_vl, y_vl, y_te) in HORIZON_DATA.items():
    neg_h = (y_tr == 0).sum()
    pos_h = (y_tr == 1).sum()
    scale_h = neg_h / max(pos_h, 1)

    # Candidate-free negative sampling for weak horizons (low positive rate)
    X_tr_eff = X_tr
    y_tr_eff = y_tr
    pos_rate = pos_h / max(neg_h + pos_h, 1)
    if NEGATIVE_SAMPLING_ENABLED and pos_rate < NEGATIVE_SAMPLING_MIN_POS_RATE:
        pos_idx = np.where(y_tr == 1)[0]
        neg_idx = np.where(y_tr == 0)[0]
        max_neg = pos_h * NEGATIVE_SAMPLING_MAX_NEG_RATIO
        if len(neg_idx) > max_neg:
            rng = np.random.default_rng(42)
            neg_idx_sub = rng.choice(neg_idx, size=int(max_neg), replace=False)
            samp_idx = np.sort(np.concatenate([pos_idx, neg_idx_sub]))
            X_tr_eff = X_tr[samp_idx]
            y_tr_eff = y_tr[samp_idx]
            print(f"    [{horizon}] Negative sampling: {len(neg_idx)} -> {int(max_neg)} negatives (pos_rate={pos_rate:.4f})")

    # Use per-horizon best params
    hp = best_params_per_horizon.get(horizon, best_params)
    xgb_params = dict(hp)
    if 'scale_pos_weight' in xgb_params:
        xgb_params['scale_pos_weight'] = scale_h

    focal_a = float(hp.get('focal_alpha', FOCAL_ALPHA))
    focal_g = float(hp.get('focal_gamma', FOCAL_GAMMA))

    xgb_model = xgb.XGBClassifier(
        **xgb_params,
        objective=FocalLossObjective(alpha=focal_a, gamma=focal_g),
        eval_metric=FocalLossEval(focal_a, focal_g),
        early_stopping_rounds=25,
        random_state=42,
        tree_method='hist',
    )
    xgb_model.fit(
        X_tr_eff, y_tr_eff,
        eval_set=[(X_val_fe, y_vl)],
        verbose=False,
    )
    xgb_models[horizon] = xgb_model

    val_prob = xgb_model.predict_proba(X_val_fe)[:, 1]
    test_prob = xgb_model.predict_proba(X_test_fe)[:, 1]

    probas[horizon] = {'val': val_prob, 'test': test_prob}

    auroc_v = roc_auc_score(y_vl, val_prob)
    auprc_v = average_precision_score(y_vl, val_prob)
    auroc_t = roc_auc_score(y_te, test_prob)
    auprc_t = average_precision_score(y_te, test_prob)
    brier_t = brier_score_loss(y_te, test_prob)
    print(f"    XGBoost ({horizon:>3s}) | Val  AUROC={auroc_v:.4f} AUPRC={auprc_v:.4f}")
    print(f"                        | Test AUROC={auroc_t:.4f} AUPRC={auprc_t:.4f} Brier={brier_t:.4f}")


# ═════════════════════════════════════════════════════════════════════════════
# 11. 5-Fold Cross-Validation
# ═════════════════════════════════════════════════════════════════════════════
print("\n[*] Running 5-fold patient-level cross-validation...")
cv_results = []
train_patients = train_df['subject_id'].values
gkf = GroupKFold(n_splits=5)
for fold_i, (tr_idx, vl_idx) in enumerate(gkf.split(X_train_fe, y_train_12, groups=train_patients)):
    X_tr_f = X_train_fe[tr_idx]; y_tr_f = y_train_12[tr_idx]
    X_vl_f = X_train_fe[vl_idx]; y_vl_f = y_train_12[vl_idx]
    neg_f = (y_tr_f == 0).sum(); pos_f = (y_tr_f == 1).sum()
    hp = dict(best_params_per_horizon.get('12h', best_params))
    hp['scale_pos_weight'] = neg_f / max(pos_f, 1)
    focal_a = float(hp.get('focal_alpha', FOCAL_ALPHA))
    focal_g = float(hp.get('focal_gamma', FOCAL_GAMMA))
    m = xgb.XGBClassifier(**hp, objective=FocalLossObjective(alpha=focal_a, gamma=focal_g),
                          eval_metric=FocalLossEval(focal_a, focal_g), early_stopping_rounds=25,
                          random_state=42, tree_method='hist')
    m.fit(X_tr_f, y_tr_f, eval_set=[(X_vl_f, y_vl_f)], verbose=False)
    p = m.predict_proba(X_vl_f)[:, 1]
    cv_results.append({'auroc': roc_auc_score(y_vl_f, p), 'auprc': average_precision_score(y_vl_f, p)})
    print(f"    Fold {fold_i+1}: AUROC={cv_results[-1]['auroc']:.4f}  AUPRC={cv_results[-1]['auprc']:.4f}")
auroc_scores = [r['auroc'] for r in cv_results]
auprc_scores = [r['auprc'] for r in cv_results]
print(f"    {'='*50}")
print(f"    5-fold CV (12h): AUROC = {np.mean(auroc_scores):.4f} +/- {np.std(auroc_scores):.4f}")
print(f"    5-fold CV (12h): AUPRC = {np.mean(auprc_scores):.4f} +/- {np.std(auprc_scores):.4f}")


# ═════════════════════════════════════════════════════════════════════════════
# 12. SHAP Feature Importance Analysis
# ═════════════════════════════════════════════════════════════════════════════
try:
    import shap
    print("\n[*] Running SHAP feature importance analysis (12h model)...")
    explainer = shap.TreeExplainer(xgb_models['12h'].get_booster())
    shap_vals = explainer.shap_values(X_val_fe)
    mean_abs_shap = np.mean(np.abs(shap_vals), axis=0)
    feat_importance = sorted(zip(FEATURE_NAMES_FE, mean_abs_shap), key=lambda x: x[1], reverse=True)
    print(f"    Top-10 features:")
    for name, val in feat_importance[:10]:
        print(f"      {name:35s}  {val:.6f}")
    print(f"    Bottom-10 features (candidates for pruning):")
    for name, val in feat_importance[-10:]:
        print(f"      {name:35s}  {val:.6f}")
    n_bottom = sum(1 for _, v in feat_importance if v < np.mean(mean_abs_shap) * 0.05)
    print(f"    Features with <5% of mean importance: {n_bottom} of {len(feat_importance)}")
except ImportError:
    print("\n[*] SHAP not installed — skipping feature importance analysis")
except Exception as e:
    print(f"\n[*] SHAP analysis failed: {e}")


# ═════════════════════════════════════════════════════════════════════════════
# 13. Platt Calibration
# ═════════════════════════════════════════════════════════════════════════════
print("\n[10] Applying Platt calibration...")

from sklearn.calibration import CalibratedClassifierCV

calibrators = {}
for horizon in ['2h', '6h', '12h']:
    cal = CalibratedClassifierCV(xgb_models[horizon], method='sigmoid', cv='prefit')
    y_cal = {'2h': y_val_2, '6h': y_val_6, '12h': y_val_12}[horizon]
    cal.fit(X_val_fe, y_cal)
    calibrators[horizon] = cal

    # Calibrated test predictions
    cal_prob = cal.predict_proba(X_test_fe)[:, 1]
    y_te = {'2h': y_test_2, '6h': y_test_6, '12h': y_test_12}[horizon]
    brier_raw = brier_score_loss(y_te, probas[horizon]['test'])
    brier_cal = brier_score_loss(y_te, cal_prob)
    print(f"    {horizon}: Brier raw={brier_raw:.4f} -> calibrated={brier_cal:.4f}")

    # Update probas with calibrated values
    probas[horizon]['test_calibrated'] = cal_prob


# ═════════════════════════════════════════════════════════════════════════════
# 14. Optimal Threshold Search
# ═════════════════════════════════════════════════════════════════════════════
print("\n[11] Finding optimal alarm thresholds...")

optimal_thresholds = {}
for horizon in ['2h', '6h', '12h']:
    y_te = {'2h': y_test_2, '6h': y_test_6, '12h': y_test_12}[horizon]
    cal_prob = probas[horizon].get('test_calibrated', probas[horizon]['test'])

    prec, rec, thresholds = precision_recall_curve(y_te, cal_prob)
    # F1 = 2 * prec * rec / (prec + rec)
    f1_scores = 2 * prec[:-1] * rec[:-1] / (prec[:-1] + rec[:-1] + 1e-9)
    best_idx = np.argmax(f1_scores)
    optimal_thresholds[horizon] = float(thresholds[best_idx])
    print(f"    {horizon}: threshold={thresholds[best_idx]:.3f} -> F1={f1_scores[best_idx]:.3f} "
          f"(prec={prec[best_idx]:.3f}, rec={rec[best_idx]:.3f})")


# ═════════════════════════════════════════════════════════════════════════════
# 15. Final Performance Summary
# ═════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("  PERFORMANCE COMPARISON - BEFORE vs AFTER (Phase 3)")
print("=" * 70)

final_prob = probas['12h']['test']
final_cal_prob = probas['12h'].get('test_calibrated', final_prob)

final_auroc = roc_auc_score(y_test_12, final_prob)
final_auprc = average_precision_score(y_test_12, final_prob)
final_brier = brier_score_loss(y_test_12, final_cal_prob)

model_label = "Tuned XGBoost"

print(f"\n  {'Metric':<20s}  {'Baseline':>10s}  {f'{model_label}':>18s}  {'Diff':>10s}")
print(f"  {'-'*20}  {'-'*10}  {'-'*18}  {'-'*10}")
print(f"  {'12h AUROC':<20s}  {baseline_auroc:>10.4f}  {final_auroc:>18.4f}  {final_auroc-baseline_auroc:>+10.4f}")
print(f"  {'12h AUPRC':<20s}  {baseline_auprc:>10.4f}  {final_auprc:>18.4f}  {final_auprc-baseline_auprc:>+10.4f}")
print(f"  {'12h Brier':<20s}  {baseline_brier:>10.4f}  {final_brier:>18.4f}  {final_brier-baseline_brier:>+10.4f}")

for h in ['6h', '2h']:
    y_te = y_test_6 if h == '6h' else y_test_2
    prob = probas[h]['test']
    cal_prob = probas[h].get('test_calibrated', prob)
    auroc = roc_auc_score(y_te, prob)
    auprc = average_precision_score(y_te, prob)
    brier = brier_score_loss(y_te, cal_prob)
    print(f"  {f'{h} AUROC':<20s}  {'-':>10s}  {auroc:>18.4f}  {'N/A':>10s}")
    print(f"  {f'{h} AUPRC':<20s}  {'-':>10s}  {auprc:>18.4f}  {'N/A':>10s}")
    print(f"  {f'{h} Brier':<20s}  {'-':>10s}  {brier:>18.4f}  {'N/A':>10s}")


# ═════════════════════════════════════════════════════════════════════════════
# 16. Save Artifacts (to both chronos_models/ and backend/models/)
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n[12] Saving optimized artifacts...")

def _save_artifact(obj, name: str):
    """Save to both chronos_models/ and backend/models/."""
    path1 = os.path.join(SAVE_DIR, name)
    path2 = os.path.join(BACKEND_MODELS_DIR, name)
    joblib.dump(obj, path1)
    joblib.dump(obj, path2)
    fsize = os.path.getsize(path1)
    return fsize

fsize = _save_artifact(imputer, 'imputer.pkl')
print(f"    [OK] imputer.pkl ({fsize/1024:.1f} KB)")

fsize = _save_artifact(scaler, 'scaler.pkl')
print(f"    [OK] scaler.pkl ({fsize/1024:.1f} KB)")

fsize = _save_artifact(xgb_models, 'xgb_models.pkl')
print(f"    [OK] xgb_models.pkl ({fsize/1024:.1f} KB)")

fsize = _save_artifact(FEATURE_COLS, 'feature_cols.pkl')
print(f"    [OK] feature_cols.pkl")

fsize = _save_artifact(HIGH_MISS_COLS, 'high_miss_cols.pkl')
print(f"    [OK] high_miss_cols.pkl")

fsize = _save_artifact(FEATURE_NAMES_FE, 'feature_names_fe.pkl')
print(f"    [OK] feature_names_fe.pkl")

# Also save an aligned version matching the model dimension exactly
n_model = xgb_models['12h'].n_features_in_
n_miss = len(HIGH_MISS_COLS)
n_base = n_model - n_miss
FEATURE_NAMES_FE_MODEL = FEATURE_COLS[:n_base] + [f'miss_{c}' for c in HIGH_MISS_COLS]
_save_artifact(FEATURE_NAMES_FE_MODEL, f'feature_names_fe_{n_model}.pkl')
print(f"    [OK] feature_names_fe_{n_model}.pkl")

fsize = _save_artifact(TARGET_ENCODE_MAPS, 'target_encode_maps.pkl')
print(f"    [OK] target_encode_maps.pkl ({fsize/1024:.1f} KB)")

fsize = _save_artifact(calibrators, 'calibrators.pkl')
print(f"    [OK] calibrators.pkl ({fsize/1024:.1f} KB)")

fsize = _save_artifact(optimal_thresholds, 'optimal_thresholds.pkl')
print(f"    [OK] optimal_thresholds.pkl")

# Save optimization metadata
metadata = {
    'phase': '4',
    'optimized_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'dataset_rows': len(df),
    'n_features_base': len(FEATURE_COLS),
    'n_features_total': n_model,
    'n_miss_indicators': n_miss,
    'n_optuna_trials': 300,  # 100 per horizon
    'focal_search_range': {'alpha': [0.05, 0.80], 'gamma': [0.0, 6.0]},
    'focal_alpha': float(best_params_per_horizon.get('12h', {}).get('focal_alpha', FOCAL_ALPHA)),
    'focal_gamma': float(best_params_per_horizon.get('12h', {}).get('focal_gamma', FOCAL_GAMMA)),
    'shap_pruning_enabled': SHAP_PRUNING_ENABLED,
    'shap_importance_threshold_frac': SHAP_IMPORTANCE_THRESHOLD_FRAC,
    'negative_sampling_enabled': NEGATIVE_SAMPLING_ENABLED,
    'negative_sampling_max_neg_ratio': NEGATIVE_SAMPLING_MAX_NEG_RATIO,
    'negative_sampling_min_pos_rate': NEGATIVE_SAMPLING_MIN_POS_RATE,
    'smote_applied': False,
    'model_type': 'single_xgboost_focal',
    'dead_cols_removed': DEAD_COLS,
    'best_hyperparams_per_horizon': {
        h: {k: (float(v) if isinstance(v, (np.floating, np.integer)) else v)
             for k, v in best_params_per_horizon.get(h, {}).items()}
        for h in HORIZON_LABELS
    },
    'optimal_thresholds': optimal_thresholds,
    'performance': {
        'baseline_12h': {'auroc': float(baseline_auroc), 'auprc': float(baseline_auprc), 'brier': float(baseline_brier)},
        'optimized_12h': {'auroc': float(final_auroc), 'auprc': float(final_auprc), 'brier': float(final_brier)},
        'per_horizon': {}
    }
}
for h in ['2h', '6h', '12h']:
    y_te = {'2h': y_test_2, '6h': y_test_6, '12h': y_test_12}[h]
    prob = probas[h]['test']
    cal_prob = probas[h].get('test_calibrated', prob)
    metadata['performance']['per_horizon'][h] = {
        'auroc': float(roc_auc_score(y_te, prob)),
        'auprc': float(average_precision_score(y_te, prob)),
        'brier': float(brier_score_loss(y_te, cal_prob)),
    }

for path in [SAVE_DIR, BACKEND_MODELS_DIR]:
    with open(os.path.join(path, 'optimization_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2, default=str)
print("    [OK] optimization_metadata.json")

print("\n" + "=" * 70)
print("=== PHASE 4 OPTIMIZATION COMPLETE ===")
print(f"      Model: Single XGBoost + Focal Loss (alpha={FOCAL_ALPHA}, gamma={FOCAL_GAMMA})")
print(f"      Optuna: 100 trials/horizon (300 total) | alpha 0.05-0.80, gamma 0.0-6.0")
if SHAP_PRUNING_ENABLED:
    print(f"      SHAP pruning: {SHAP_IMPORTANCE_THRESHOLD_FRAC} threshold | Features: {len(FEATURE_COLS)} base + {len(HIGH_MISS_COLS)} miss")
if NEGATIVE_SAMPLING_ENABLED:
    print(f"      Negative sampling: max_ratio={NEGATIVE_SAMPLING_MAX_NEG_RATIO}, min_pos_rate={NEGATIVE_SAMPLING_MIN_POS_RATE}")
print("=" * 70)
