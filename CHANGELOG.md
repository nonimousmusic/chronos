# Changelog

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
