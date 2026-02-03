-- Recreate team_settings_public view WITHOUT security_invoker
-- This allows public access to non-sensitive team branding data
-- while keeping admin_owner_user_id protected in the base table

DROP VIEW IF EXISTS public.team_settings_public;

CREATE VIEW public.team_settings_public AS
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
-- Note: security_invoker is OFF by default, so this view will use owner privileges
-- and bypass the admin-only RLS on the base table, but excludes admin_owner_user_id