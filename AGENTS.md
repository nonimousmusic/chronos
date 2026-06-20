# Chronos ML Pipeline — Agent Memory

## Project State
- Pipeline: training (`optimize_iou.py`) + inference (`predictor.py`) + artifact loader (`loader.py`)
- Target: sepsis/shock early warning (2h/6h/12h horizons)
- Training data: `machine_learning/data/datasets_13339.csv` (~13k rows, 94 cols)
- Feature count: **76 base + 22 miss indicators = 98 total** (SHAP-pruned from ~109)
- Model: **Single XGBoost with focal loss + SHAP pruning + negative sampling**
- Focal loss classes live in shared module `backend/app/ml/focal_loss.py` (pickleable callable classes)
- Artifacts saved to both `machine_learning/chronos_models/` and `backend/models/`
- Backend has JWT auth middleware (Supabase) on all `/api/*` except public endpoints
- All endpoints return consistent `{"detail": ...}` error format via global exception handler
- Pipeline has 5-fold patient-level CV (GroupKFold) + SHAP feature importance analysis + negative sampling for weak horizons

## Latest Results (Phase 4, 2026-06-20)
- **12h AUROC: 0.7287** (nearly identical to Phase 3 best 0.7345, −0.006 with 11 fewer features)
- **12h AUPRC: 0.5130** (vs Phase 3 0.5225, −0.009)
- **2h AUROC: 0.7210** (+2.8% vs previous best 0.7016) — best ever 2h ranking performance
- **2h AUPRC: 0.1804** (+11.7% vs Phase 3 0.1615) — strong improvement from focal + sampling
- **5-fold CV (12h): AUROC = 0.7221 ± 0.013, AUPRC = 0.4998 ± 0.027**
- SHAP pruning removed 11 low-importance features with no meaningful performance loss

### Performance Across All Phases
| Phase | Approach | 12h AUROC | 12h AUPRC | 12h Brier |
|-------|----------|-----------|-----------|-----------|
| 1 | Ensemble + SMOTE | 0.7145 | 0.4897 | 0.1719 |
| 2 | Ensemble + SMOTE + 22 new features | 0.7206 | 0.4979 | 0.1718 |
| 3 | Single XGBoost + 12 new features | 0.7345 | 0.5225 | 0.1633 |
| 4 | Focal loss + SHAP pruning + neg sampling | 0.7287 | 0.5130 | **0.1645** |

### Per-Horizon Results (Phase 4)
| Horizon | AUROC | AUPRC | Brier |
|---------|-------|-------|-------|
| 12h     | 0.7287 | 0.5130 | 0.1645 |
| 6h      | 0.7001 | 0.3508 | 0.1120 |
| 2h      | **0.7210** | 0.1804 | 0.0464 |

### Optimal Alarm Thresholds
- 12h = 0.177, 6h = 0.130, 2h = 0.082

## Phase 2 Feature Engineering (22 new features)

### 1. Clinical Interaction Features (8)
File: `optimize_iou.py:186-202`, `predictor.py:445-457`

Built from domain knowledge of physiological relationships:

| Feature | Formula | Rationale |
|---------|---------|-----------|
| `age_x_charlson` | age × charlson_comorbidity_index | Age-comorbidity synergy |
| `lactate_x_creatinine` | lactate × creatinine | Multi-organ failure severity |
| `hr_x_temp` | hr × temp_c | Hemodynamic stress response |
| `map_x_lactate` | map_mean × lactate | Tissue perfusion deficit |
| `bili_x_creatinine` | bilirubin_total × creatinine | Hepato-renal syndrome risk |
| `gcs_x_age` | gcs_total × age | Neurological risk in elderly |
| `pf_x_vent` | pf_ratio × vent_active | Respiratory severity |
| `shock_x_lactate` | shock_index × lactate | Shock severity amplification |

### 2. Polynomial (Squared) Features (5)
File: `optimize_iou.py:204-212`, `predictor.py:459-463`

Captures non-linear dose-response relationships for key continuous variables:
- `lactate_squared` — lactate has exponential mortality risk above ~4 mmol/L
- `creatinine_squared` — AKI severity accelerates at high creatinine
- `hr_squared` — tachycardia risk is non-linear
- `age_squared` — age risk accelerates >65
- `sofa_approx_squared` — SOFA score has non-linear mortality relationship

### 3. Delta-from-History Features (5)
File: `optimize_iou.py:214-227`, `predictor.py:465-476`

Current value minus 12h aggregate — captures clinical trajectory/trend:
- `lactate_delta_from_max_12h` — lactate clearance (negative = improving)
- `creatinine_delta_from_max_12h` — AKI trajectory
- `hr_delta_from_mean_12h` — heart rate deviation from baseline
- `map_delta_from_mean_12h` — pressure stability
- `shock_index_delta_from_max_12h` — shock trend

At inference time, historical aggregates may not be available (single-row prediction), so these default to **0.0**.

### 4. Target Encoding for Categorical Features (4)
File: `optimize_iou.py:254-275`, `predictor.py:478-486`

Smoothed target encoding replaces raw category labels with the empirical event rate (smoothed toward global mean). Fitted on the **training split only** to prevent leakage.

**Categories encoded:**
- `race` → `race_target_enc`
- `gender` → `gender_target_enc`
- `first_careunit` → `first_careunit_target_enc`
- `admission_type` → `admission_type_target_enc`

**Smoothing formula:**
```
smoothed = (category_mean * n_cat + global_mean * smoothing) / (n_cat + smoothing)
```
- `smoothing = 10` — categories with <10 samples are heavily pulled toward global mean
- Unknown categories at inference map to **0.0**

**Artifact:** `target_encode_maps.pkl` — dict of {column_name: {category_value: encoded_value}}

## Phase 3 Feature Engineering (12 advanced clinical features)
File: `optimize_iou.py:228-328`, `predictor.py:491-543`

### 1. Organ Failure Count
`organ_failure_count` — Count of SOFA subsystems (resp, coag, liver, renal, cardio, cns) with score > 0. A simple count of failing organ systems is more predictive than the SOFA sum itself.

### 2. Paired Organ Failures
- `paired_cardioresp_failure` = sofa_resp × sofa_cardio — cardiorespiratory failure carries >50% mortality
- `paired_hepatorenal_failure` = sofa_liver × sofa_renal — high mortality compound failure

### 3. Lab Derangement Score
`lab_derangement_score` — Count of abnormal lab values from 12 thresholds across 8 lab types (lactate > 2, creatinine > 1.2, platelets < 150, bilirubin > 1.2, wbc > 12 or < 4, sodium < 135 or > 145, potassium < 3.5 or > 5.5, hemoglobin < 10, glucose > 180). Captures metabolic and organ dysfunction burden at a glance.

### 4. Variability Metrics
- `hr_cv` = hr_std_12h / hr_mean_12h — coefficient of variation for heart rate (low variability = worse outcome)
- `map_drop_ratio` = (map_mean - map_min_12h) / map_mean — what fraction of MAP was lost at worst
- `shock_progression_index` = shock_index / shock_index_max_12h — how close the patient is to their worst shock state

### 5. Trajectory Features
- `lactate_clearance_ratio` = (lactate_max_12h - lactate) / lactate_max_12h — positive = clearing lactate (improving)
- `platelets_delta_from_min_12h` = platelets - platelets_min_12h — positive = platelet recovery
- `pf_ratio_change` = pf_ratio - pf_ratio_min_12h — positive = improving oxygenation

### 6. Composite Severity Scores
- `oasis_x_sofa` = oasis × sofa_approx — general acuity × organ failure
- `sapsii_x_lactate` = sapsii × lactate — physiology score × metabolic stress

## Code Structure

### Training Pipeline (`optimize_iou.py`) — updated with CV, SHAP, focal loss, dead code cleanup
```
Section 1-2:   Data loading, dead column removal (~80 cols → ~70 base features)
Section 3a:    Rate-of-change features (delta_*_1h)
Section 3b:    Interaction features (4 Phase 1 interactions)
Section 3c:    Ratio features (hr_rr_ratio, urine_creat_ratio)
Section 3d:    Phase 2 — Clinical interactions (8)
Section 3e:    Phase 2 — Squared features (5)
Section 3f:    Phase 2 — Delta-from-history (5)
Section 3g:    Phase 3 — Advanced derived features (12)
Section 4:     Patient-level split (70/15/15)
Section 4b:    Phase 2 — Target encoding (fit → transform train/val/test)
Section 5:     Preprocessing (impute → missing indicators → scale → high-miss indicators)
Section 6:     Baseline model (default XGBoost for comparison)
Section 7:     Optuna hyperparameter search (300 trials, includes focal loss alpha/gamma)
Section 8:     Train tuned XGBoost per horizon with focal loss (no SMOTE, no ensemble)
Section 9:     5-fold patient-level cross-validation (GroupKFold, 12h only)
Section 10:    SHAP feature importance analysis (top-10 / bottom-10, pruning candidates)
Section 11:    Platt calibration (sigmoid)
Section 12:    Optimal threshold search (max F1)
Section 13:    Save artifacts
```

### Focal Loss Module (`backend/app/ml/focal_loss.py`)
- Contains `FocalLossObjective` and `FocalLossEval` — module-level callable classes
- Imported by both `optimize_iou.py` and `loader.py` for pickle serialization
- Focal loss parameters (alpha, gamma) are set on the class instances before passing to XGBoost

### Inference (`predictor.py`)
- `_apply_feature_engineering(features, target_encode_maps=None)` at line 388
- Called from `predict()` at line 47
- Mirrors all Phase 1 + Phase 2 + Phase 3 feature engineering identically
- Uses `FocalLossObjective.from_dict()` for focal loss models, falls back to `None` for non-focal

### Artifact Loader (`loader.py`)
- `target_encode_maps.pkl` loaded at line 101-106 as optional artifact
- Backward compatible — missing file = no target encoding applied
- Handles both regular XGBoost and focal loss models

### Backend API (`backend/app/api.py`)
- JWT auth middleware at line ~42-58 — validates Supabase `Authorization: Bearer <token>` on all `/api/*` endpoints except `/api/health`, `/api/snapshot`, `/api/stream`, `/ws/live`
- Global exception handler — single handler returning `{"detail": ...}` in all environments
- Graceful degradation when Supabase is unconfigured (allows unauthenticated access)

## Supabase
- Backend client: `backend/app/supabase_client.py` — reads `SUPABASE_URL` + `SUPABASE_KEY`, falls back to `VITE_*` vars
- Frontend client: `frontend/src/supabaseClient.ts` — reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- SQL migrations in `supabase/` — run in order (01→08) in Supabase SQL Editor
- `07_notification_trigger.sql`: Auto-creates notification row when `risk_predictions.risk_percentage >= 70` (80+ = ringing, 70-79 = silent)
- `08_auth_trigger.sql`: Auto-creates `public.users` row when user signs up via Supabase Auth (pulls name/role from `raw_user_meta_data`)
- Backend uses anon key (sufficient with permissive RLS); README docs corrected for key name

## Key Constraints
- Training and inference feature code **MUST be identical** — any feature created in `optimize_iou.py` must exist in `predictor.py`'s `_apply_feature_engineering`
- Inference uses `_apply_feature_engineering(features, target_encode_maps=artifacts.get("target_encode_maps"))`
- Pipeline runs on **CPU only** (no GPU)
- All new features must be **reproducible from raw inputs** at inference time
- **Backward compatibility** maintained — all optional artifacts silently default to None/missing
- Target encoding maps are fitted on training fold only and serialized separately
- Focal loss classes must be importable from `backend.app.ml.focal_loss` for pickle resolution
- Train script may use Unicode box-drawing chars in comments only (not in print() statements, which fail on Windows CP1252)

## Artifact Loading Order
1. `xgb_models.pkl` (required)
2. `scaler.pkl` (required)
3. `imputer.pkl` (required)
4. `feature_cols.pkl` (required)
5. `feature_names_fe.pkl` / `feature_names_fe_*.pkl` (optional, auto-discovered)
6. `high_miss_cols.pkl` (optional, defaults to [])
7. `calibrators.pkl` (optional, Platt scaling)
8. `optimal_thresholds.pkl` (optional, alarm thresholds)
9. `target_encode_maps.pkl` (optional, Phase 2 categorical encoding)

## Tests (7 passing, ~8.5s)
- `tests/test_integration.py`:
  - 4 existing tests (chain processing, Merkle tree)
  - 3 new ML round-trip tests: artifact loading, valid probability output, horizon risk ordering

## REMAINING_WORK.md
- Created at `machine_learning/docs/REMAINING_WORK.md` — 9 sections:
  1. CatBoost removal from requirements.txt
  2. Candidate-free negative sampling for weak horizons
  3. SHAP-based feature pruning
  4. Focal loss hyperparameter refinement
  5. Real-time data pipeline integration
  6. Backend deployment hardening
  7. Monitoring & alerting
  8. A/B testing framework
  9. Documentation & handoff
