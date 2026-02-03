-- Fix team_settings RLS: Restrict direct table access to admins only
-- The team_settings_public view (which excludes admin_owner_user_id) is used for public access

-- Drop the existing policy that allows all authenticated users to read
DROP POLICY IF EXISTS "Authenticated users can read team_settings" ON public.team_settings;

-- Create a new admin-only read policy for the base table
CREATE POLICY "Admins can read team_settings"
  ON public.team_settings
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));