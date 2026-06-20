-- ═══════════════════════════════════════════════════════════════
-- Step 7: Auto-create notifications from risk_predictions
-- Run this AFTER 02_tables.sql (and 05_rls_policies.sql)
--
-- When a new risk_prediction is inserted with risk_percentage >= 70,
-- a notification is auto-created for the doctor alert bell.
--   risk_percentage 70-79 → silent notification
--   risk_percentage 80+   → ringing notification
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_risk_prediction_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.risk_percentage >= 70 THEN
    INSERT INTO public.notifications (patient_id, risk_score, type, message)
    VALUES (
      NEW.patient_id,
      NEW.risk_percentage,
      CASE WHEN NEW.risk_percentage >= 80 THEN 'ringing' ELSE 'silent' END,
      COALESCE(NEW.event, 'Risk score elevated') || ' — ' || NEW.risk_percentage || '%'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_risk_prediction_notification ON public.risk_predictions;

CREATE TRIGGER trg_risk_prediction_notification
  AFTER INSERT ON public.risk_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_risk_prediction_notification();
