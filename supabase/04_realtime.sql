-- ═══════════════════════════════════════════════════════════════
-- Step 4: Enable Realtime
-- Run this AFTER 02_tables.sql
--
-- These tables need realtime for live push updates:
--   notifications  → Doctor alert bell
--   instructions   → Nurse receives new tasks
--   administered   → Medication status updates
--   complaints     → Patient complaint updates
--   qr_tokens      → Detects family QR scan
-- ═══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE instructions;
ALTER PUBLICATION supabase_realtime ADD TABLE administered;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE qr_tokens;
