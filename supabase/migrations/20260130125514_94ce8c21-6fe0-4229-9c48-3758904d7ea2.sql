-- Fix the SECURITY DEFINER VIEW issue by recreating the view with security_invoker = true
DROP VIEW IF EXISTS public.team_settings_public;

CREATE VIEW public.team_settings_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  team_name,
  team_logo_url,
  description,
  tagline,
  watermark_enabled,
  watermark_handle,
  watermark_position,
  created_at,
  updated_at
FROM public.team_settings;

-- Grant SELECT on the public view
GRANT SELECT ON public.team_settings_public TO anon, authenticated;