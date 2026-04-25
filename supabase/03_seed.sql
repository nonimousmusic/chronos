-- ═══════════════════════════════════════════════════════════════
-- Step 3: Seed Sample Data
-- Run this AFTER 02_tables.sql
-- ═══════════════════════════════════════════════════════════════


-- ─── ICU Units ───────────────────────────────────────────────
INSERT INTO units (unit_type) VALUES
  ('ICU-A (Critical Care)'),
  ('ICU-B (Post-Op Recovery)'),
  ('ICU-C (Neonatal)'),
  ('ICU-D (Neuro)')
ON CONFLICT DO NOTHING;


-- ─── Patients ────────────────────────────────────────────────
-- IDs match the frontend simulation engine expectations
INSERT INTO patients (id, name, age, gender, bed, unit_id, status, admit_reason) VALUES
  ('P-1042', 'Rajesh Sharma',   58, 'M', 4,  1, 'critical',  'Post-CABG Recovery'),
  ('P-1043', 'Amira Osei',      34, 'F', 7,  1, 'observing', 'Sepsis Protocol'),
  ('P-1044', 'Kenji Nakamura',  71, 'M', 2,  1, 'stable',    'ARDS Ventilation'),
  ('P-1045', 'Elena Vasquez',   45, 'F', 9,  2, 'critical',  'Multi-organ Failure'),
  ('P-1046', 'David Okafor',    62, 'M', 12, 2, 'stable',    'Post-Hepatectomy'),
  ('P-1047', 'Sofia Andersson', 29, 'F', 5,  1, 'observing', 'Pneumothorax Drainage')
ON CONFLICT (id) DO NOTHING;


-- ─── Sample Reports ─────────────────────────────────────────
INSERT INTO reports (patient_id, report_type, file_path) VALUES
  ('P-1042', 'Cardiac Imaging',     'vault://cardiac/ecg_report_1042.pdf'),
  ('P-1042', 'Post-Op Lab Panel',   'vault://labs/panel_1042.pdf'),
  ('P-1043', 'Blood Culture',       'vault://labs/culture_1043.pdf'),
  ('P-1044', 'Chest X-Ray',         'vault://imaging/cxr_1044.dcm'),
  ('P-1045', 'Liver Function Test', 'vault://labs/lft_1045.pdf')
ON CONFLICT DO NOTHING;


-- ─── Sample Risk Predictions ────────────────────────────────
INSERT INTO risk_predictions (patient_id, risk_percentage, event, shap_1, shap_2, shap_3) VALUES
  ('P-1042', 84, 'Cardiac Arrest',       'Lactate > 4.2', 'MAP < 60',       'HR Variability ↓'),
  ('P-1043', 62, 'Septic Shock',         'WBC > 18k',     'Temp > 38.5°C',  'Lactate Rising'),
  ('P-1045', 91, 'Multi-Organ Failure',  'Creatinine ↑',  'Bilirubin > 6',  'SOFA > 12')
ON CONFLICT DO NOTHING;
