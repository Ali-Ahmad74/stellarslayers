-- 1) Extend team_settings with share-card watermark controls
ALTER TABLE public.team_settings
ADD COLUMN IF NOT EXISTS watermark_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS watermark_handle text,
ADD COLUMN IF NOT EXISTS watermark_position text NOT NULL DEFAULT 'bottom-right';

-- 2) Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  entity text NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_audit_log' AND policyname = 'Admins can read audit log'
  ) THEN
    CREATE POLICY "Admins can read audit log"
    ON public.admin_audit_log
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 3) Security definer writer (bypasses RLS, but only for admins)
CREATE OR REPLACE FUNCTION public.insert_admin_audit_log(p_entity text, p_action text, p_details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  INSERT INTO public.admin_audit_log(actor_user_id, entity, action, details)
  VALUES (auth.uid(), p_entity, p_action, COALESCE(p_details, '{}'::jsonb));
END;
$$;

-- 4) Trigger functions (OLD/NEW are only available inside triggers)
CREATE OR REPLACE FUNCTION public.audit_scoring_settings_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.insert_admin_audit_log(
    'scoring_settings',
    'update',
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_team_settings_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.insert_admin_audit_log(
    'team_settings',
    'update',
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_scoring_settings ON public.scoring_settings;
CREATE TRIGGER trg_audit_scoring_settings
AFTER UPDATE ON public.scoring_settings
FOR EACH ROW
EXECUTE FUNCTION public.audit_scoring_settings_update();

DROP TRIGGER IF EXISTS trg_audit_team_settings ON public.team_settings;
CREATE TRIGGER trg_audit_team_settings
AFTER UPDATE ON public.team_settings
FOR EACH ROW
EXECUTE FUNCTION public.audit_team_settings_update();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON public.admin_audit_log(entity);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log(actor_user_id);