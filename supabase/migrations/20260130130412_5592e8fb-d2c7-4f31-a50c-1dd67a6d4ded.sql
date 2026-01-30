-- Fix team_settings access - remove anonymous access completely
-- Drop the authenticated policy we just created
DROP POLICY IF EXISTS "Authenticated users can read team_settings" ON public.team_settings;

-- Now the only policies on team_settings are:
-- 1. "Admin full access for team_settings" - allows admins full CRUD

-- We need to allow authenticated users to read, but via the view only
-- The team_settings_public view with security_invoker=on will use the caller's permissions
-- So we need a SELECT policy on the base table for the view to work

-- Create a policy for authenticated users to SELECT (needed for view to work)
CREATE POLICY "Authenticated users can read team_settings"
ON public.team_settings
FOR SELECT
TO authenticated
USING (true);

-- Also revoke SELECT from anon role directly on the table
REVOKE SELECT ON public.team_settings FROM anon;

-- Keep anon access to the public view which has filtered columns
GRANT SELECT ON public.team_settings_public TO anon, authenticated;

-- For admin_audit_log - ensure deny-all for non-admins
-- The table already has RLS enabled and only has the admin read policy
-- Anonymous users should not be able to read at all
REVOKE ALL ON public.admin_audit_log FROM anon;

-- For player_stats view - it's a view so RLS doesn't apply directly
-- Grant is already done, this is public data by design