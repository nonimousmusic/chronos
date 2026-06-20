-- ═══════════════════════════════════════════════════════════════
-- Step 8: Auto-create public.users row on signup
-- Run this AFTER 02_tables.sql (and 05_rls_policies.sql)
--
-- When a user signs up via Supabase Auth (auth.users), auto-create
-- a corresponding row in public.users so FK references work.
-- Default role is 'doctor' — change in dashboard if needed.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1), 'New User'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'doctor')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
