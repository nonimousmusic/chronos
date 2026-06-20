# Changelog

## [1.2.0] - 2026-06-20

### Added
- Phase 3 advanced derived clinical features (12 new): organ failure count, lab derangement score, paired organ failures, HR coefficient of variation, MAP drop ratio, shock progression index, lactate clearance, platelet recovery, PF ratio trajectory, OASIS×SOFA composite, SAPSII×lactate composite
- Per-horizon Optuna tuning: each horizon (12h/6h/2h) gets its own hyperparameter search (100 trials each)

### Changed
- Pipeline simplified: removed SMOTE oversampling, removed LightGBM/CatBoost ensemble, single XGBoost only
- SMOTE was actively degrading performance — baseline single XGBoost consistently beat the ensemble
- Optuna search narrowed to XGBoost-only (removed LGBM search path)
- Feature count increased from ~92 to ~104

### Performance (Final)
| Horizon | AUROC | AUPRC | Brier |
|---------|-------|-------|-------|
| 12h     | 0.7345 | 0.5225 | 0.1629 |
| 6h      | 0.6864 | 0.3377 | 0.1122 |
| 2h      | 0.6784 | 0.1639 | 0.0474 |
- 12h AUROC: **0.7345** (+2.8% vs Phase 1 0.7145, +1.9% vs Phase 2 0.7206)
- 12h AUPRC: **0.5225** (+6.7% vs Phase 1, +4.9% vs Phase 2)
- 12h Brier: **0.1629** (-5.2% vs Phase 2 0.1718)

## [1.1.0] - 2026-06-20

### Added
- Phase 2 feature engineering (22 new features): 8 clinical interactions, 5 squared polynomials, 5 delta-from-history, 4 target-encoded categoricals
- Target encoding artifact (`target_encode_maps.pkl`) with smoothed encoding for race, gender, first_careunit, admission_type
- Backend artifact loader support for target encoding maps (backward-compatible)

### Changed
- ML pipeline switched from Phase 1 to Phase 2 feature set
- Feature count increased from ~70 to ~92
- Updated comparison baseline to Phase 2 feature baseline

### Performance
- 12h AUROC: 0.7206 (+0.86% vs Phase 1)
- 12h AUPRC: 0.4979 (+1.68% vs Phase 1)
- 12h Brier: 0.1718 (same as Phase 1)

## [1.0.0] - 2026-04-21

### Added
- SHA-256 cryptographic hash chaining engine for surgical video frames and vitals
- Merkle tree batching with configurable batch size (default 60 records)
- Blockchain anchoring stub with real web3.py support (EVM-compatible)
- Session verification engine — detects tampered frames, altered vitals, missing files, chain breaks
- Camera capture pipeline supporting DepthAI OAK-D, OpenCV webcam, and synthetic frames
- MIMIC-IV vitals replay system for realistic ICU data simulation
- Supabase integration: 12 database tables, Row-Level Security, real-time subscriptions, storage buckets
- Chronos ML Engine: XGBoost multi-horizon risk prediction (2h/6h/12h) with 119 features
- ML optimization pipeline: Optuna hyperparameter tuning, focal loss, feature engineering
- SHAP explainability with beeswarm, temporal, and force plots
- Frontend: Sentinel Monitor with live video, hash matrix, Merkle tree viz, magnetic timeline
- Frontend: Chronos Dashboard with risk scores, vitals ticker, triage radar, 3D human model
- Frontend: ICU Command Center with doctor workflow, orders, medications, QR scanning
- Frontend: Nurse Dashboard with task management, medication administration
- Frontend: Patient Portal with medical records, medication history, complaints, QR access
- Dark/light theme with system preference detection
- Supabase authentication with role-based routing (doctor/nurse/patient)
- Vercel deployment configuration with serverless support
- Docker Compose for local development
- 32 backend unit tests covering hasher, batcher, Merkle tree, and verifier

### Changed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Performance
- Frame processing: 30 FPS @ 1920x1080
- Hash computation: <50ms per frame (SHA-256)
- Merkle batching: 1,800 frames/hour
- API response: <100ms (p95)
- Model inference: <500ms per patient
- ML 12h AUROC: 0.7231 (optimized)
