# Remaining Work — Chronos ML + Vital Shield AI

Last updated: 2026-06-21
Source: conversation history, codebase analysis, ROADMAP.md, REPORT.md

---

## 1. ML PIPELINE (highest priority)

### 1.1 6h / 2h Feature Engineering
- 12h AUROC 0.7345 is near ceiling for this dataset size (13k rows). 6h (0.686) and 2h (0.678) lag significantly.
- Need horizon-specific features: shorter-term vitals trends, rate-of-change over narrower windows, separation vitals features (HRV, BP variability, pulse pressure).
- Focal loss gave 2h AUPRC a +15% boost to 0.186 but still very weak.

### 1.2 Cross-Validation
- Current single 70/15/15 split is noisy — Phase 3 results varied ±0.005 AUROC across runs.
- 5-fold patient-level CV would give reliable performance estimates and confidence intervals.
- Low priority if dataset cannot expand, but essential before any clinical deployment.

### 1.3 SHAP Analysis & Feature Pruning
- 157 features is a lot for 13k rows. Likely many are noise.
- SHAP beeswarm exists but hasn't been used for pruning decisions.
- Action: run `shap.TreeExplainer`, identify bottom 20-30 features with near-zero importance, remove and re-tune.

### 1.4 Candidate-Free Negative Sampling
- 6h/2h have very few positives (sepsis/shock onset far in future).
- Current training includes all negatives — many are "too easy" (patient discharged before prediction window).
- Restrict negatives to patients who stayed N hours post-observation, excluding those discharged early.

### 1.5 Optuna Search Refinement
- Focal alpha/gamma tuning range may be too wide (0.15-0.50 / 0.5-4.0). Converged values often at alpha extremes.
- Trial budget is low (100/horizon). Increase to 200/horizon once other improvements are locked.
- Add Bayesian optimization priors based on Phase 3b results.

### 1.6 Calibration Comparison
- Platt scaling currently used. Compare with isotonic regression and beta calibration.
- Evaluate calibration curves by decile for each horizon.

### 1.7 Data Expansion
- Current dataset is 13,399 rows from MIMIC-IV. Model performance likely saturating.
- Generate additional features from raw MIMIC-IV tables (prescriptions, microbiology, input/output) if BigQuery access is restored.

---

## 2. SURGICAL VISION IOU (not started)

### 2.1 YOLOv11-seg Segmentation Model
- `IOU_OPTIMIZATION_GUIDE.md` has full plan: YOLOv11-seg, Dice loss, temporal consistency via EMA.
- No code exists yet. Need segmentation dataset (surgical instrument labels).
- Integration with existing frame processing pipeline in `capture.py`.

### 2.2 Vision Predictor Module
- `backend/app/ml/vision_predictor.py` is planned but not created.
- Will need its own artifact loading, inference pipeline, and API endpoint.

### 2.3 IOU Tracking & Metrics
- Per-frame IOU computation, temporal consistency scoring.
- Dashboard frontend integration (ChronosView or separate view).

---

## 3. BLOCKCHAIN ANCHORING

### 3.1 Real Web3 Integration
- `blockchain.py` has `send_root()` and `verify_root_on_chain()` as stubs with a comment: "Switch to real web3.py".
- Need: working smart contract (Solidity), deployed on Sepolia/testnet, real tx gas estimation, retry queue.
- Current implementation uses a mock in-memory store.

### 3.2 On-Chain Verification Dashboard
- Frontend has `/api/blockchain-verify/` endpoint but no real data to verify against.
- Need contract verification page or panel in SentinelView.

---

## 4. FRONTEND

### 4.1 Component Tests
- Only 4 test files exist (config, sounds, theme context). Major components untested.
- Target: test auth flows, SHAP explainer rendering, risk score display, Sentinel chain visualization.
- Use Vitest + Testing Library (already configured).

### 4.2 ICU Command Center — Real Data Integration
- Much of the UI is static/mock data. Connect to real Supabase data:
  - Doctor orders → `instructions` table
  - Patient lists → `patients` + `patient_doctor` join
  - Notifications → `notifications` table
- QR scanner (`PatientScanner.tsx`) needs supabase patient lookup.

### 4.3 Nurse Dashboard — Task Management
- Medication administration workflow is mocked. Needs real Supabase `administered` table mutations.
- Task completion tracking, status updates.

### 4.4 Patient Portal — Real Records
- Medical records, medication history, complaints — all static demo data.
- Connect to Supabase with proper RLS (patient sees own data only).

### 4.5 Error Handling & Loading States
- Some components lack loading spinners, error boundaries, empty states.
- `AmbientParticles.tsx` is a particle background — not a loading indicator.

### 4.6 Accessibility
- Keyboard navigation, ARIA labels, screen reader support not implemented.
- Color contrast in dark mode needs verification.

---

## 5. BACKEND

### 5.1 API Error Handling
- Some endpoints lack try/except with structured error responses.
- `api.py` has 518 lines but inconsistent error format (some return `{"error": ...}`, others raise HTTPException).

### 5.2 Rate Limiting & Auth
- No rate limiting on `/api/predict` or streaming endpoints.
- Auth context exists in frontend but backend has no middleware to validate Supabase JWT tokens on API requests.
- Doctor/nurse/patient roles are enforced in frontend UI only — anyone can call any API.

### 5.3 Session Persistence Edge Cases
- `storage.py` saves to local JSON files. Not crash-safe if process dies mid-write.
- Supabase storage integration is configured but not consistently used.
- No session cleanup/archival for completed sessions.

### 5.4 MIMIC Vitals Replay
- `vitals_source.py` reads from extracted JSON. Works for demo but not real-time clinical use.
- Would need HL7/FHIR interface for hospital integration (Phase 5).

---

## 6. TESTS

### 6.1 Frontend Tests
- Coverage is near 0% (4 trivial test files).
- Need component tests, integration tests, and E2E tests for critical flows.

### 6.2 Backend Integration Tests
- `test_integration.py` exists but minimal.
- Add: full pipeline test (capture → hash → batch → store → verify), ML prediction round-trip, WebSocket broadcast.

### 6.3 ML Smoke Tests
- `test_ml_smoke.py` exists. Should verify that all 3 models produce valid probability outputs (0-1 range, monotonic risk).

---

## 7. CI/CD & INFRASTRUCTURE

### 7.1 GitHub Actions CI
- Backend job installs `catboost` from requirements but CatBoost is no longer used (Phase 3 removed it).
- Remove CatBoost from requirements to speed up CI.
- Frontend job does not run frontend tests (only type-check/lint/build). Add `vitest --run`.

### 7.2 Production Deployment
- `deploy.sh` is minimal. No health checks, rollback, or zero-downtime deployment.
- Docker images need vulnerability scanning.
- Environment-specific config (dev/staging/prod) not separated.

### 7.3 Monitoring
- No Sentry or error tracking integration.
- No performance monitoring (API latency, ML inference time, frame pipeline throughput).
- No structured logging (current logging is ad-hoc `print()` and `logger.info()`).

---

## 8. DOCUMENTATION

### 8.1 API Reference
- `README.md` has endpoint documentation but it's manual and may drift.
- Consider auto-generating from FastAPI (OpenAPI/Swagger) — FastAPI already has this built-in.

### 8.2 ML Model Card
- No model card documenting intended use, population, limitations, bias, performance across subgroups.
- Important for clinical context — should document AUROC by age, sex, race deciles.

### 8.3 Deployment Runbook
- No runbook for production deployment, rollback, incident response.
- `REPORT.md#suggestion-10` suggests this.

---

## 9. STRETCH / PHASE 5

### 9.1 Multi-Hospital Support
- Current schema supports multiple care units but not multiple hospitals.
- Would need organization-level tenant isolation.

### 9.2 Telemedicine Integration
- Video streaming exists but no telemedicine features (consultation, remote rounding).

### 9.3 FHIR Integration
- HL7 FHIR API for hospital EMR integration. Required for real clinical deployment.

### 9.4 FDA Clearance Pathway
- No regulatory documentation. If this is a real medical device, Class II FDA 510(k) would be needed.
- Clinical validation study design, IRB approval, data privacy (HIPAA compliance).
