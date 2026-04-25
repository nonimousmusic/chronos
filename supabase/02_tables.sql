-- ═══════════════════════════════════════════════════════════════
-- Step 2: Create All Tables
-- Run this AFTER 01_extensions.sql
-- ═══════════════════════════════════════════════════════════════


-- ─── 1. UNITS (ICU wards/sections) ───────────────────────────
CREATE TABLE IF NOT EXISTS units (
  unit_id    SERIAL PRIMARY KEY,
  unit_type  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 2. USERS (doctors, nurses — linked to Supabase Auth) ───
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'doctor',
  duty_start            TEXT,
  duty_end              TEXT,
  assigned_doctor_name  TEXT,
  assigned_icu_ward     TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 3. PATIENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  age          INT,
  gender       TEXT,
  bed          INT,
  unit_id      INT REFERENCES units(unit_id),
  status       TEXT DEFAULT 'stable',
  admit_reason TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 4. INSTRUCTIONS (doctor orders → nurse tasks) ──────────
CREATE TABLE IF NOT EXISTS instructions (
  instruction_id  SERIAL PRIMARY KEY,
  doctor_id       UUID REFERENCES users(id),
  patient_id      TEXT REFERENCES patients(id),
  nurse_id        UUID REFERENCES users(id),
  text            TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',
  notes           TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 5. ADMINISTERED (medication administration log) ────────
CREATE TABLE IF NOT EXISTS administered (
  admin_id        SERIAL PRIMARY KEY,
  doctor_id       UUID REFERENCES users(id),
  patient_id      TEXT REFERENCES patients(id),
  nurse_id        UUID REFERENCES users(id),
  medicine        TEXT NOT NULL,
  dosage          TEXT,
  route           TEXT DEFAULT 'IV',
  is_administered BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  administered_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 6. COMPLAINTS (patient-submitted requests) ─────────────
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id     SERIAL PRIMARY KEY,
  patient_id       TEXT REFERENCES patients(id),
  nurse_id         UUID,
  complaint_text   TEXT NOT NULL,
  status           TEXT DEFAULT 'open',
  resolution_notes TEXT,
  resolved_at      TIMESTAMPTZ,
  resolved_by      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 7. REPORTS (clinical documents) ─────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  report_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id  TEXT REFERENCES patients(id),
  report_type TEXT,
  file_path   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 8. RISK_PREDICTIONS (AI risk scores from Chronos) ──────
CREATE TABLE IF NOT EXISTS risk_predictions (
  prediction_id   SERIAL PRIMARY KEY,
  patient_id      TEXT REFERENCES patients(id),
  risk_percentage NUMERIC,
  event           TEXT,
  shap_1          TEXT,
  shap_2          TEXT,
  shap_3          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 9. NOTIFICATIONS (realtime alerts for doctors) ─────────
CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  patient_id      TEXT,
  risk_score      INT,
  type            TEXT DEFAULT 'silent',
  message         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 10. OT_BLOCKS (surgical session hash blocks) ───────────
CREATE TABLE IF NOT EXISTS ot_blocks (
  block_id    SERIAL PRIMARY KEY,
  patient_id  TEXT REFERENCES patients(id),
  curr_hash   TEXT,
  bp          NUMERIC,
  spo2        NUMERIC,
  heart_rate  NUMERIC,
  recorded_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 11. PATIENT_REMINDERS (follow-up reminders) ────────────
CREATE TABLE IF NOT EXISTS patient_reminders (
  reminder_id   SERIAL PRIMARY KEY,
  patient_id    TEXT REFERENCES patients(id),
  title         TEXT NOT NULL,
  reminder_date TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 12. QR_TOKENS (secure family access tokens) ────────────
CREATE TABLE IF NOT EXISTS qr_tokens (
  token_id     SERIAL PRIMARY KEY,
  token_string UUID DEFAULT gen_random_uuid(),
  patient_id   TEXT REFERENCES patients(id),
  is_used      BOOLEAN DEFAULT FALSE,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
