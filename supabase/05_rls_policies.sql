-- ═══════════════════════════════════════════════════════════════
-- Step 5: Row Level Security (RLS) Policies
-- Run this AFTER 02_tables.sql
--
-- NOTE: These are demo-grade permissive policies.
-- For production, restrict INSERT/UPDATE to specific roles.
-- ═══════════════════════════════════════════════════════════════


-- ─── Enable RLS on all tables ────────────────────────────────

ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE units              ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE administered       ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_predictions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_blocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_reminders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens          ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own profile"
  ON users FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ═══════════════════════════════════════════════════════════════
-- PATIENTS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Patients viewable by authenticated"
  ON patients FOR SELECT TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════════════════
-- UNITS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Units viewable by authenticated"
  ON units FOR SELECT TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════════════════
-- INSTRUCTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Instructions readable by authenticated"
  ON instructions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Doctors can create instructions"
  ON instructions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Assigned users can update instructions"
  ON instructions FOR UPDATE TO authenticated
  USING (auth.uid() = nurse_id OR auth.uid() = doctor_id);


-- ═══════════════════════════════════════════════════════════════
-- ADMINISTERED (medications)
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Medications readable by authenticated"
  ON administered FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Doctors can create medication orders"
  ON administered FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Assigned nurse can administer"
  ON administered FOR UPDATE TO authenticated
  USING (auth.uid() = nurse_id OR auth.uid() = doctor_id);


-- ═══════════════════════════════════════════════════════════════
-- COMPLAINTS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Complaints readable by authenticated"
  ON complaints FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can create complaints"
  ON complaints FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can resolve complaints"
  ON complaints FOR UPDATE TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════════════════
-- REPORTS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Reports viewable by authenticated"
  ON reports FOR SELECT TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════════════════
-- RISK_PREDICTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Predictions viewable by authenticated"
  ON risk_predictions FOR SELECT TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Notifications viewable by authenticated"
  ON notifications FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can mark notifications read"
  ON notifications FOR UPDATE TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════════════════
-- OT_BLOCKS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "OT Blocks viewable by authenticated"
  ON ot_blocks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can create OT blocks"
  ON ot_blocks FOR INSERT TO authenticated
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════
-- PATIENT_REMINDERS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Reminders viewable by authenticated"
  ON patient_reminders FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Doctors can create reminders"
  ON patient_reminders FOR INSERT TO authenticated
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════
-- QR_TOKENS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "QR tokens viewable by authenticated"
  ON qr_tokens FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Doctors can create QR tokens"
  ON qr_tokens FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Token status can be updated"
  ON qr_tokens FOR UPDATE TO authenticated
  USING (true);
