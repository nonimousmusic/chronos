# Chronos ML — Phase 2 & 3 Changes

## Overview

Three phases of ML pipeline optimization on the `datasets_13339.csv` dataset (~13k rows, MIMIC-IV derived). Goal: improve 12h sepsis/shock prediction AUROC/AUPRC beyond initial 0.7145 baseline.

---

## Phase 1 — Initial Pipeline (baseline)

**Approach:** 300 Optuna trials → SMOTE oversampling → 3-model ensemble (XGBoost+LightGBM+CatBoost) → Platt calibration → threshold optimization

**Result:** 12h AUROC 0.7145, AUPRC 0.4897, Brier 0.1719

---

## Phase 2 — Feature Engineering (22 new features)

**Problem:** Phase 1 hit an algorithmic ceiling. The ensemble/SMOTE pipeline was not improving beyond single-model baselines.

### What was added (3d/3e/3f/4b in `optimize_iou.py`):

| Category | Count | Features |
|----------|-------|----------|
| Clinical interactions | 8 | `age_x_charlson`, `lactate_x_creatinine`, `hr_x_temp`, `map_x_lactate`, `bili_x_creatinine`, `gcs_x_age`, `pf_x_vent`, `shock_x_lactate` |
| Polynomial (squared) | 5 | `lactate_squared`, `creatinine_squared`, `hr_squared`, `age_squared`, `sofa_approx_squared` |
| Delta-from-history | 5 | `lactate_delta_from_max_12h`, `creatinine_delta_from_max_12h`, `hr_delta_from_mean_12h`, `map_delta_from_mean_12h`, `shock_index_delta_from_max_12h` |
| Target encoding | 4 | `race_target_enc`, `gender_target_enc`, `first_careunit_target_enc`, `admission_type_target_enc` |

### New artifact:
`target_encode_maps.pkl` — fitted on training fold, maps category → smoothed event rate

### Files changed:
- `optimize_iou.py` — sections 3d-3f, 4b
- `predictor.py` — `_apply_feature_engineering()` extended with Phase 2 features
- `loader.py` — added loading of `target_encode_maps.pkl`

### Result: 12h AUROC 0.7206 (+0.86%), AUPRC 0.4979 (+1.68%)

---

## Phase 3 — Pipeline Simplification + Advanced Features

**Key discovery:** The baseline single XGBoost with default params consistently beat the optimized 3-model ensemble + SMOTE. SMOTE/ensemble was actively degrading performance.

### Changes:

#### A. Pipeline simplification (sections 7-10 in `optimize_iou.py`):
- Removed SMOTE oversampling entirely
- Removed LightGBM and CatBoost ensemble members
- Pipeline now: Optuna → single XGBoost per horizon → Platt calibration → threshold opt
- Optuna narrowed to XGBoost-only (removed LGBM search path)
- Per-horizon tuning: 3 separate Optuna studies (100 trials each) instead of one 300-trial study for 12h only

#### B. Advanced derived clinical features (section 3g, 12 new):

| Feature | Derivation | Why |
|---------|-----------|-----|
| `organ_failure_count` | Count of 6 SOFA subscores > 0 | # failing organs > SOFA sum for mortality prediction |
| `paired_cardioresp_failure` | sofa_resp × sofa_cardio | Cardiorespiratory failure is highly lethal |
| `paired_hepatorenal_failure` | sofa_liver × sofa_renal | Hepato-renal syndrome carries >50% mortality |
| `lab_derangement_score` | Count of 12 lab abnormality thresholds | Captures metabolic/organ dysfunction burden holistically |
| `hr_cv` | hr_std_12h / hr_mean_12h | Low HR variability → worse outcome |
| `map_drop_ratio` | (map_mean - map_min_12h) / map_mean | Pressure instability fraction |
| `shock_progression_index` | shock_index / shock_index_max_12h | Ratio: how close to worst shock state |
| `lactate_clearance_ratio` | (lactate_max_12h - lactate) / lactate_max_12h | Positive = clearing lactate (improving) |
| `platelets_delta_from_min_12h` | platelets - platelets_min_12h | Positive = platelet recovery |
| `pf_ratio_change` | pf_ratio - pf_ratio_min_12h | Positive = improving oxygenation |
| `oasis_x_sofa` | oasis × sofa_approx | General acuity × organ failure severity |
| `sapsii_x_lactate` | sapsii × lactate | Physiology score × metabolic stress |

### Files changed:
- `optimize_iou.py` — section 3g added, sections 8-10 rewritten (SMOTE/ensemble removed, per-horizon Optuna added)
- `predictor.py` — Phase 3 features mirrored in `_apply_feature_engineering()`

### Final result: 12h AUROC 0.7345 (+2.8% vs Phase 1), AUPRC 0.5225 (+6.7%)

---

## Performance Summary

| Phase | Description | 12h AUROC | 12h AUPRC | 12h Brier |
|-------|------------|-----------|-----------|-----------|
| 0 | Initial (CHRONOS_FEATURES.md baseline) | 0.7231 | — | — |
| 1 | 3-model ensemble + SMOTE | 0.7145 | 0.4897 | 0.1719 |
| 2 | +22 hand-crafted features | 0.7206 | 0.4979 | 0.1718 |
| 3a | +12 derived features, single XGBoost | 0.7325 | 0.5195 | 0.1633 |
| 3b | Per-horizon Optuna tuning | **0.7345** | **0.5225** | **0.1629** |

### Per-horizon (final):
| Horizon | AUROC | AUPRC | Brier |
|---------|-------|-------|-------|
| 12h | **0.7345** | **0.5225** | **0.1629** |
| 6h | 0.6864 | 0.3377 | 0.1122 |
| 2h | 0.6784 | 0.1639 | 0.0474 |

### Optimal alarm thresholds (max F1):
| Horizon | Threshold | F1 | Precision | Recall |
|---------|-----------|----|-----------|--------|
| 12h | 0.236 | 0.513 | 0.422 | 0.654 |
| 6h | 0.223 | 0.361 | 0.354 | 0.369 |
| 2h | 0.100 | 0.259 | 0.252 | 0.267 |

---

## Feature Count Progression

| Stage | Features |
|-------|----------|
| Base dataset | ~80 (raw columns) |
| After dead column removal | ~70 |
| + Phase 1 interactions/ratios | ~74 |
| + Phase 2 (22 features) | ~92 |
| + Phase 3 (12 features) | ~104 |
| + High-missingness indicators | ~157 total (model input dim) |

---

## Current Pipeline Architecture

```
datasets_13339.csv
  ↓
[1-2] Load + dead column removal
  ↓
[3a-3g] Feature engineering (~104 cols)
  ├── Rate-of-change (5): delta_*_1h
  ├── Interactions (4): shock_x_vaso, lactate_x_sofa, map_x_ne, hr_x_shock
  ├── Ratios (2): hr_rr_ratio, urine_creat_ratio
  ├── Phase 2 interactions (8)
  ├── Phase 2 squared (5)
  ├── Phase 2 delta-history (5)
  └── Phase 3 advanced derived (12)
  ↓
[4] Patient-level split (70/15/15)
  ↓
[4b] Target encoding (fit on train, transform all)
  ↓
[5] Preprocessing: impute → missing indicators → scale → high-miss features
  ↓  (157-dim feature vector)
[6] Baseline XGBoost (default params, for comparison)
  ↓
[7] Per-horizon Optuna (100 trials × 3 horizons = 300 total)
  ↓
[8] Train tuned XGBoost per horizon
  ↓
[9] Platt calibration (sigmoid)
  ↓
[10] Optimal threshold search (max F1)
  ↓
[11] Save artifacts
```

---

## Artifacts (`chronos_models/` and `backend/models/`)

| File | Content | Required |
|------|---------|----------|
| `xgb_models.pkl` | Dict of 3 XGBoost models (12h/6h/2h) | Yes |
| `scaler.pkl` | sklearn StandardScaler | Yes |
| `imputer.pkl` | sklearn SimpleImputer (median) | Yes |
| `feature_cols.pkl` | Ordered feature column list | Yes |
| `feature_names_fe.pkl` | Full feature names (base + missing indicators) | Optional |
| `high_miss_cols.pkl` | High-missingness column list | Optional |
| `calibrators.pkl` | Platt sigmoid calibrators per horizon | Optional |
| `optimal_thresholds.pkl` | Per-horizon F1-maximizing thresholds | Optional |
| `target_encode_maps.pkl` | Categorical → smoothed target encoding maps | Optional |
| `optimization_metadata.json` | Run metadata, params, performance | Metadata |

---

## What's Left / Future Work

### Short-term improvements (low effort, moderate impact):
1. **SHAP analysis** — Understand which of ~104 features drive predictions. Validate clinical plausibility. Could identify noise features to prune.
2. **Isotonic calibration** — Try isotonic regression vs Platt sigmoid for calibration. May improve Brier further.
3. **Focal loss tuning** — Alpha and gamma were never optimized (fixed at 0.35/2.5). Could run a small Optuna study just for these.

### Medium-term (moderate effort, uncertain impact):
4. **6h/2h specific feature engineering** — These horizons have fundamentally less signal. May need different feature sets (e.g., more weight on rate-of-change, less on static scores). Current features optimized for 12h.
5. **External data from BigQuery** — The dataset is a pre-joined MIMIC extract. Re-running the BigQuery pipeline to add prescriptions, microbiology, diagnoses_icd could unlock new signal. Requires cloud access.

### Longer-term (high effort):
6. **Temporal/sequence modeling** — Use raw time series (available in `extracted_vitals.json`) with LSTM/Transformer instead of feature-engineered snapshots. Requires fundamentally different data pipeline.
7. **Online learning / drift monitoring** — Deploy model with performance tracking, detect data drift, trigger retraining.

### Key open questions:
- Why does 2h AUPRC plateau at ~0.16? Is it a fundamental signal problem (not enough information 2 hours before an event) or a feature problem?
- Could the 2h/6h models benefit from a completely different hyperparameter search space (more regularization, different loss functions)?
- Is the 12h model good enough for production (0.7345 AUROC, 0.5225 AUPRC)?
