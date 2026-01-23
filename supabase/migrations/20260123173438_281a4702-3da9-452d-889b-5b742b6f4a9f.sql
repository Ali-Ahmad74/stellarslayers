-- Fix: convert SECURITY DEFINER view(s) to SECURITY INVOKER
-- This ensures permissions/RLS are evaluated as the querying user.

DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT schemaname, viewname
    FROM pg_views
    WHERE schemaname = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true);', v.schemaname, v.viewname);
    EXCEPTION WHEN others THEN
      -- Ignore views that don't support the parameter on this Postgres version.
      NULL;
    END;
  END LOOP;
END;
$$;