-- Add a short tagline field for consistent branding across UI + share cards
ALTER TABLE public.team_settings
ADD COLUMN IF NOT EXISTS tagline text;