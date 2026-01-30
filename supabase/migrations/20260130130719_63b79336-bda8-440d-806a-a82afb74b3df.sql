-- Fix the remaining security issues

-- 1. Fix team_settings policy to require authentication
DROP POLICY IF EXISTS "Authenticated users can read team_settings" ON public.team_settings;

CREATE POLICY "Authenticated users can read team_settings"
ON public.team_settings
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. Ensure user_roles policies are properly scoped
-- The existing policies look correct but let's verify the structure
-- Users can view their own roles: (auth.uid() = user_id) 
-- Admins can view all roles: has_role(auth.uid(), 'admin')
-- These are both already scoped to authenticated users

-- No changes needed for user_roles as the policies require auth.uid() which is only set for authenticated users