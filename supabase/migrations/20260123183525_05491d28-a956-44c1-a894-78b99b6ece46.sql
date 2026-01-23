ALTER TABLE public.team_settings
ADD COLUMN IF NOT EXISTS admin_owner_user_id uuid;