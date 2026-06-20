# Project Report: Synapse GTB (Vital Shield AI)

**Generated:** 2026-06-20
**Version:** 1.0.0 (Production status)
**Creator:** Gurbaaz Singh (sole developer)

---

## 1. Project Summary

| Item | Value |
|------|-------|
| **Name** | Synapse GTB / Vital Shield AI |
| **Type** | Surgical Black Box & Sentinel Monitor + Chronos ML ICU Risk Prediction |
| **Tech** | React 19 + FastAPI + XGBoost + Supabase + Web3 |
| **Lines of Code** | ~14,572 (3,358 Python, 11,214 TypeScript/TSX) |
| **Tests** | 32/32 passing (100%) |
| **Frontend Build** | Successful (2.6MB bundle, 74KB CSS) |
| **Last Model Training** | 2026-04-21 |

---

## 2. Completion Estimate: ~85-90%

### What's Fully Done

- SHA-256 cryptographic hash chaining engine
- Merkle tree batching with blockchain anchoring (stub)
- Session verification (tamper detection)
- Camera capture pipeline (DepthAI / webcam / synthetic)
- MIMIC-IV vitals replay
- Supabase database (12 tables), Row-Level Security, realtime subscriptions, storage
- Chronos ML Engine (XGBoost, 119 features, SHAP explainability, Optuna optimization)
- Frontend: Sentinel Monitor, Chronos Dashboard, ICU Command Center, Nurse Dashboard, Patient Portal
- Dark/light theme, authentication (Supabase), QR scanning
- Vercel deployment configuration
- Docker Compose orchestration

### What's Missing / Partial

| Feature | Status | Notes |
|---------|--------|-------|
| Surgical Vision IOU | ❌ Not started | Roadmap documented, zero code |
| Blockchain anchoring | ⚠️ Stub mode | Returns mock tx hashes, needs real EVM contract |
| Backend vision inference module | ❌ Not started | `ml/vision_predictor.py` planned |
| CI/CD pipeline | ❌ Not in repo | GitHub Actions referenced in README |
| Frontend tests | ❌ None | 0 component/integration tests |
| Integration / E2E tests | ❌ None | |
| CHANGELOG / ROADMAP file | ❌ None | |
| Code-splitting | ⚠️ Warning | 2.6MB JS bundle |

---

## 3. Test Results

**32 tests / 32 passed (100%)**

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `tests/test_hasher.py` | 14 | SHA-256 correctness, canonical payload determinism, chain hash computation |
| `tests/test_batcher.py` | 5 | Merkle batching logic, batch triggers, buffer reset, `send_root` calls |
| `tests/test_merkle.py` | 8 | Merkle tree computation (empty through 4 leaves), determinism, order sensitivity |
| `tests/test_verifier.py` | 10 | Valid session verification, tampered frame/vitals, missing files, cascade failure |

**Not covered:** Integration tests, frontend tests, blockchain anchoring tests, vision pipeline.

---

## 4. Hardcoded / Stub Values

| Location | What | Impact |
|----------|------|--------|
| `backend/app/blockchain.py` | Stub mode — returns `"0xMOCK_TX"` | Blockchain anchoring doesn't write to chain |
| `backend/app/config.py` | Chain genesis: `0x0000...0000` | Acceptable for hash chain start |
| `backend/app/config.py` | FPS=1, JPEG=70, Camera=webcam, Batch=60 | All overridable via env vars |
| `backend/app/config.py` | Vitals file path → frontend data dir | Works locally, fragile in production |
| `frontend/src/data/parse_vitals.py` | 10 mock patient IDs | Demo data only |

**Severity: Low-Medium.** Most values are env-configurable. Blockchain stub is the most significant but is a conscious demo decision.

---

## 5. ML Model Accuracy (Chronos Engine)

Trained on MIMIC-IV, optimized with Optuna + focal loss + feature engineering.

| Horizon | AUROC | AUPRC | Brier Score |
|---------|-------|-------|-------------|
| 12 hours | **0.7231** | **0.5061** | **0.1652** |

- Model: XGBoost with 119 features, multi-horizon ensemble
- Optimization: Focal loss, rate-of-change features, interaction features, Platt calibration
- Charts available: ROC/PR curves, SHAP beeswarm, temporal SHAP, DCA, risk trajectories
- **Interpretation:** 0.7231 AUROC is decent but not production-grade (0.80+ is typical for clinical deployment)

---

## 6. What's Left To Do

### High Priority

- [ ] **Code-splitting** — break 2.6MB bundle with `React.lazy()` and `manualChunks`
- [ ] **Frontend tests** — component + integration tests (Vitest + React Testing Library)
- [ ] **CI/CD pipeline** — create `.github/workflows/` for automated testing + deployment

### Medium Priority

- [ ] **Surgical Vision IOU** — implement YOLOv11-seg instrument tracking
- [ ] **Production blockchain** — replace stub with real EVM contract anchoring
- [ ] **Integration / E2E tests** — test full pipeline: capture → hash → merkle → verify
- [ ] **Create CHANGELOG.md + ROADMAP.md**

### Low Priority

- [ ] **Optimize ML model** (target AUROC > 0.80)
- [ ] **Add Sentry / error monitoring**
- [ ] **Performance budget** for frontend (LCP < 2.5s, TTI < 3.5s)
- [ ] **Add ESLint + Prettier config**

---

## 7. Suggestions

| # | Suggestion | Rationale |
|---|-----------|-----------|
| 1 | Set up ESLint + Prettier for both stacks | No lint config found — catches bugs early |
| 2 | Add GitHub Actions CI | No automated testing on push/PR |
| 3 | Implement real blockchain anchoring | Stub defeats the purpose of immutable audit trail |
| 4 | Add frontend tests (Vitest + RTL) | Zero frontend coverage is a risk |
| 5 | Code-split the frontend | 2.6MB bundle hurts initial load time |
| 6 | Make all config env-based | API/WS URLs should be configurable |
| 7 | Improve ML AUROC to > 0.80 | 0.7231 is not clinically deployable |
| 8 | Add integration tests for full pipeline | Currently unit-test-only |
| 9 | Add structured error monitoring (Sentry) | No error monitoring in place |
| 10 | Document deployment runbook | README lacks step-by-step deploy guide |

---

## 8. Overall Assessment

**Strengths:** Clean architecture, comprehensive test coverage for core crypto pipeline, impressive ML pipeline with full optimization, well-documented API, modern frontend stack with good UX patterns.

**Weaknesses:** Blockchain in stub mode, no frontend/CI-CD/vision code, large bundle, zero frontend testing.

**Verdict:** The core value proposition (cryptographic surgical black box + ML risk prediction) is ~90% complete. The remaining 10-15% is production hardening (CI/CD, testing, bundle optimization, real blockchain deployment). The Surgical Vision IOU feature is 0% implemented but well-documented.
