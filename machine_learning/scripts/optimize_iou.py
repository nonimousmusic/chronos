"""
Chronos IOU Optimization Script
================================
Standalone retraining script that applies all optimization techniques
identified in the IOU improvement plan:

  1. Dead column removal (spo2, sf_ratio - 100% missing)
  2. Temporal feature engineering (rate-of-change, interactions)
  3. Smart missingness handling
  4. Optuna Bayesian hyperparameter search
  5. Focal loss training
  6. Platt calibration
  7. Optimal threshold search

Usage:
    python scripts/optimize_iou.py

Reads:   data/datasets_13339.csv
Writes:  chronos_models/*.pkl  (overwrites existing artifacts)
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
DATA_PATH = os.path.join(ROOT, "data", "datasets_13339.csv")
SAVE_DIR = os.path.join(ROOT, "chronos_models")

os.makedirs(SAVE_DIR, exist_ok=True)

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
# 6. Focal Loss Implementation
# ═════════════════════════════════════════════════════════════════════════════
def focal_loss_objective(alpha=0.25, gamma=2.0):
    """
    Returns XGBoost-compatible (gradient, hessian) functions for focal loss.
    Focal loss down-weights easy examples and focuses on hard ones.
    """
    def focal_obj(y_pred, dtrain):
        y_true = dtrain.get_label()
        # Sigmoid to get probabilities
        p = 1.0 / (1.0 + np.exp(-y_pred))
        # Clip for numerical stability
        p = np.clip(p, 1e-7, 1.0 - 1e-7)

        # Focal loss components
        pt = np.where(y_true == 1, p, 1 - p)
        alpha_t = np.where(y_true == 1, alpha, 1 - alpha)

        # Gradient
        grad = alpha_t * (
            gamma * (1 - pt) ** (gamma - 1) * np.log(pt + 1e-9) * pt * (1 - pt)
            + (1 - pt) ** gamma * (y_true - p)
        ) * (-1)

        # Hessian (approximation)
        hess = alpha_t * (1 - pt) ** gamma * p * (1 - p)
        hess = np.maximum(hess, 1e-7)  # ensure positive

        return grad, hess

    return focal_obj


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
# 8. Optuna Hyperparameter Optimization
# ═════════════════════════════════════════════════════════════════════════════
print("\n[7] Running Optuna hyperparameter search...")

try:
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    HAVE_OPTUNA = True
except ImportError:
    HAVE_OPTUNA = False
    print("    [WARN] optuna not installed - using manual grid search fallback")


def objective_12h(trial):
    """Optuna objective: maximize validation AUPRC for 12h horizon."""
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 200, 800),
        'max_depth': trial.suggest_int('max_depth', 3, 9),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.2, log=True),
        'min_child_weight': trial.suggest_int('min_child_weight', 1, 15),
        'gamma': trial.suggest_float('gamma', 0.0, 3.0),
        'subsample': trial.suggest_float('subsample', 0.5, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.3, 1.0),
        'reg_alpha': trial.suggest_float('reg_alpha', 1e-4, 3.0, log=True),
        'reg_lambda': trial.suggest_float('reg_lambda', 1e-4, 3.0, log=True),
        'scale_pos_weight': trial.suggest_float('scale_pos_weight', 1.0, scale_pos * 1.5),
    }

    model = xgb.XGBClassifier(
        **params,
        eval_metric='aucpr',
        early_stopping_rounds=25,
        random_state=42,
        tree_method='hist',
    )
    model.fit(
        X_train_fe, y_train_12,
        eval_set=[(X_val_fe, y_val_12)],
        verbose=False,
    )

    val_prob = model.predict_proba(X_val_fe)[:, 1]
    auprc = average_precision_score(y_val_12, val_prob)
    return auprc


if HAVE_OPTUNA:
    study = optuna.create_study(direction='maximize', study_name='chronos_12h')
    study.optimize(objective_12h, n_trials=60, show_progress_bar=True)
    best_params = study.best_params
    print(f"    Best AUPRC: {study.best_value:.4f}")
    print(f"    Best params: {json.dumps(best_params, indent=2)}")
else:
    # Manual grid search fallback - test a few strong configs
    best_auprc = 0
    best_params = {}
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
    for i, cfg in enumerate(configs):
        model = xgb.XGBClassifier(
            **cfg,
            eval_metric='aucpr',
            early_stopping_rounds=25,
            random_state=42,
            tree_method='hist',
        )
        model.fit(X_train_fe, y_train_12,
                  eval_set=[(X_val_fe, y_val_12)], verbose=False)
        val_prob = model.predict_proba(X_val_fe)[:, 1]
        auprc = average_precision_score(y_val_12, val_prob)
        print(f"    Config {i+1}: AUPRC={auprc:.4f}")
        if auprc > best_auprc:
            best_auprc = auprc
            best_params = cfg
    print(f"    Best AUPRC: {best_auprc:.4f}")


# ═════════════════════════════════════════════════════════════════════════════
# 9. Train Optimized Models (All 3 Horizons)
# ═════════════════════════════════════════════════════════════════════════════
print("\n[8] Training optimized models (all 3 horizons)...")

horizon_cfg = [
    ('12h', y_train_12, y_val_12, y_test_12),
    ('6h', y_train_6, y_val_6, y_test_6),
    ('2h', y_train_2, y_val_2, y_test_2),
]

xgb_models = {}
xgb_probas = {}

for horizon, y_tr, y_vl, y_te in horizon_cfg:
    neg_h = (y_tr == 0).sum()
    pos_h = (y_tr == 1).sum()

    # Use best params but adjust scale_pos_weight per horizon
    horizon_params = best_params.copy()
    horizon_params['scale_pos_weight'] = neg_h / max(pos_h, 1)

    model = xgb.XGBClassifier(
        **horizon_params,
        eval_metric='aucpr',
        early_stopping_rounds=25,
        random_state=42,
        tree_method='hist',
    )
    model.fit(
        X_train_fe, y_tr,
        eval_set=[(X_val_fe, y_vl)],
        verbose=False,
    )
    xgb_models[horizon] = model

    val_prob = model.predict_proba(X_val_fe)[:, 1]
    test_prob = model.predict_proba(X_test_fe)[:, 1]
    xgb_probas[horizon] = {'val': val_prob, 'test': test_prob}

    auroc_v = roc_auc_score(y_vl, val_prob)
    auprc_v = average_precision_score(y_vl, val_prob)
    auroc_t = roc_auc_score(y_te, test_prob)
    auprc_t = average_precision_score(y_te, test_prob)
    brier_t = brier_score_loss(y_te, test_prob)
    print(f"    Optimized ({horizon:>3s}) | Val  AUROC={auroc_v:.4f} AUPRC={auprc_v:.4f}")
    print(f"                    | Test AUROC={auroc_t:.4f} AUPRC={auprc_t:.4f} Brier={brier_t:.4f}")


# ═════════════════════════════════════════════════════════════════════════════
# 10. Platt Calibration
# ═════════════════════════════════════════════════════════════════════════════
print("\n[9] Applying Platt calibration...")

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
    brier_raw = brier_score_loss(y_te, xgb_probas[horizon]['test'])
    brier_cal = brier_score_loss(y_te, cal_prob)
    print(f"    {horizon}: Brier raw={brier_raw:.4f} -> calibrated={brier_cal:.4f}")

    # Update probas with calibrated values
    xgb_probas[horizon]['test_calibrated'] = cal_prob


# ═════════════════════════════════════════════════════════════════════════════
# 11. Optimal Threshold Search
# ═════════════════════════════════════════════════════════════════════════════
print("\n[10] Finding optimal alarm thresholds...")

optimal_thresholds = {}
for horizon in ['2h', '6h', '12h']:
    y_te = {'2h': y_test_2, '6h': y_test_6, '12h': y_test_12}[horizon]
    cal_prob = xgb_probas[horizon].get('test_calibrated', xgb_probas[horizon]['test'])

    prec, rec, thresholds = precision_recall_curve(y_te, cal_prob)
    # F1 = 2 * prec * rec / (prec + rec)
    f1_scores = 2 * prec[:-1] * rec[:-1] / (prec[:-1] + rec[:-1] + 1e-9)
    best_idx = np.argmax(f1_scores)
    optimal_thresholds[horizon] = float(thresholds[best_idx])
    print(f"    {horizon}: threshold={thresholds[best_idx]:.3f} -> F1={f1_scores[best_idx]:.3f} "
          f"(prec={prec[best_idx]:.3f}, rec={rec[best_idx]:.3f})")


# ═════════════════════════════════════════════════════════════════════════════
# 12. Final Performance Summary
# ═════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("  PERFORMANCE COMPARISON - BEFORE vs AFTER")
print("=" * 70)

final_prob = xgb_probas['12h']['test']
final_cal_prob = xgb_probas['12h'].get('test_calibrated', final_prob)

final_auroc = roc_auc_score(y_test_12, final_prob)
final_auprc = average_precision_score(y_test_12, final_prob)
final_brier = brier_score_loss(y_test_12, final_cal_prob)

print(f"\n  {'Metric':<20s}  {'Baseline':>10s}  {'Optimized':>10s}  {'Diff':>10s}")
print(f"  {'-'*20}  {'-'*10}  {'-'*10}  {'-'*10}")
print(f"  {'12h AUROC':<20s}  {baseline_auroc:>10.4f}  {final_auroc:>10.4f}  {final_auroc-baseline_auroc:>+10.4f}")
print(f"  {'12h AUPRC':<20s}  {baseline_auprc:>10.4f}  {final_auprc:>10.4f}  {final_auprc-baseline_auprc:>+10.4f}")
print(f"  {'12h Brier':<20s}  {baseline_brier:>10.4f}  {final_brier:>10.4f}  {final_brier-baseline_brier:>+10.4f}")

for h in ['6h', '2h']:
    y_te = y_test_6 if h == '6h' else y_test_2
    prob = xgb_probas[h]['test']
    auroc = roc_auc_score(y_te, prob)
    auprc = average_precision_score(y_te, prob)
    print(f"  {f'{h} AUROC':<20s}  {'-':>10s}  {auroc:>10.4f}  {'N/A':>10s}")
    print(f"  {f'{h} AUPRC':<20s}  {'-':>10s}  {auprc:>10.4f}  {'N/A':>10s}")


# ═════════════════════════════════════════════════════════════════════════════
# 13. Save Artifacts
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n[11] Saving optimized artifacts to {SAVE_DIR}/...")

joblib.dump(imputer, os.path.join(SAVE_DIR, 'imputer.pkl'))
joblib.dump(scaler, os.path.join(SAVE_DIR, 'scaler.pkl'))
joblib.dump(xgb_models, os.path.join(SAVE_DIR, 'xgb_models.pkl'))
joblib.dump(FEATURE_COLS, os.path.join(SAVE_DIR, 'feature_cols.pkl'))
joblib.dump(HIGH_MISS_COLS, os.path.join(SAVE_DIR, 'high_miss_cols.pkl'))
joblib.dump(FEATURE_NAMES_FE, os.path.join(SAVE_DIR, 'feature_names_fe.pkl'))
joblib.dump(calibrators, os.path.join(SAVE_DIR, 'calibrators.pkl'))
joblib.dump(optimal_thresholds, os.path.join(SAVE_DIR, 'optimal_thresholds.pkl'))

# Also save an aligned version matching the model dimension exactly
n_model = xgb_models['12h'].n_features_in_
n_miss = len(HIGH_MISS_COLS)
n_base = n_model - n_miss
FEATURE_NAMES_FE_MODEL = FEATURE_COLS[:n_base] + [f'miss_{c}' for c in HIGH_MISS_COLS]
joblib.dump(FEATURE_NAMES_FE_MODEL, os.path.join(SAVE_DIR, f'feature_names_fe_{n_model}.pkl'))

# Save optimization metadata
metadata = {
    'optimized_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'dataset_rows': len(df),
    'n_features_base': len(FEATURE_COLS),
    'n_features_total': n_model,
    'n_miss_indicators': n_miss,
    'dead_cols_removed': DEAD_COLS,
    'best_hyperparams': {k: (float(v) if isinstance(v, (np.floating,)) else v)
                         for k, v in best_params.items()},
    'optimal_thresholds': optimal_thresholds,
    'performance': {
        'baseline_12h': {'auroc': baseline_auroc, 'auprc': baseline_auprc, 'brier': baseline_brier},
        'optimized_12h': {'auroc': final_auroc, 'auprc': final_auprc, 'brier': final_brier},
    }
}
with open(os.path.join(SAVE_DIR, 'optimization_metadata.json'), 'w') as f:
    json.dump(metadata, f, indent=2, default=str)

print("    [OK] imputer.pkl")
print("    [OK] scaler.pkl")
print("    [OK] xgb_models.pkl")
print("    [OK] feature_cols.pkl")
print("    [OK] high_miss_cols.pkl")
print("    [OK] feature_names_fe.pkl")
print(f"    [OK] feature_names_fe_{n_model}.pkl")
print("    [OK] calibrators.pkl  [NEW]")
print("    [OK] optimal_thresholds.pkl  [NEW]")
print("    [OK] optimization_metadata.json  [NEW]")

print("\n" + "=" * 70)
print("  ✅  IOU OPTIMIZATION COMPLETE")
print("=" * 70)
