# Roadmap

## Phase 1: Production Hardening (Current)

- [x] ESLint + Prettier configuration
- [x] GitHub Actions CI/CD pipeline
- [ ] Code-split frontend bundle (target <1MB per chunk)
- [ ] Frontend component tests (Vitest + React Testing Library)
- [ ] Backend integration tests for full pipeline
- [ ] Replace blockchain stub with real EVM anchoring

## Phase 2: Surgical Vision IOU

- [ ] Implement YOLOv11-seg instrument segmentation
- [ ] Backend vision inference module (`ml/vision_predictor.py`)
- [ ] Real-time instrument tracking overlay in Sentinel Monitor
- [ ] IOU score computation and visualization
- [ ] Performance optimization for 30 FPS inference

## Phase 3: Clinical Validation

- [ ] ML model AUROC > 0.80 for all horizons
- [ ] External validation on additional ICU datasets
- [ ] Calibration curve analysis and Platt scaling refinement
- [ ] Decision curve analysis across multiple thresholds
- [ ] Clinical pilot study protocol

## Phase 4: Production Deployment

- [ ] Real blockchain contract deployment (Polygon/Sepolia)
- [ ] Sentry error monitoring and alerting
- [ ] Performance budgeting (LCP < 2.5s, TTI < 3.5s)
- [ ] Load testing (1000+ concurrent sessions)
- [ ] HIPAA compliance review
- [ ] Disaster recovery and backup procedures

## Phase 5: Platform Expansion

- [ ] Multi-hospital support with data isolation
- [ ] Real-time telemedicine integration
- [ ] Mobile companion app (React Native)
- [ ] EHR integration (HL7 FHIR)
- [ ] Federated learning across hospital sites
- [ ] FDA 510(k) submission pathway
