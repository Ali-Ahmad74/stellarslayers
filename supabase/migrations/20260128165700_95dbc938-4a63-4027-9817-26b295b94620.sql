-- Create match templates for saving common lineups
CREATE TABLE IF NOT EXISTS public.match_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  player_ids INTEGER[] NOT NULL DEFAULT '{}'::INTEGER[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure template names are unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'match_templates_name_key'
  ) THEN
    ALTER TABLE public.match_templates
      ADD CONSTRAINT match_templates_name_key UNIQUE (name);
  END IF;
END$$;

-- Keep updated_at current
DROP TRIGGER IF EXISTS set_match_templates_updated_at ON public.match_templates;
CREATE TRIGGER set_match_templates_updated_at
BEFORE UPDATE ON public.match_templates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.match_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
DROP POLICY IF EXISTS "Admins can manage match templates" ON public.match_templates;
CREATE POLICY "Admins can manage match templates"
ON public.match_templates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
