-- Scoring settings (single-row) for customizable weights
CREATE TABLE IF NOT EXISTS public.scoring_settings (
  id integer PRIMARY KEY DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Overall weighting of categories
  batting_weight numeric NOT NULL DEFAULT 0.4,
  bowling_weight numeric NOT NULL DEFAULT 0.35,
  fielding_weight numeric NOT NULL DEFAULT 0.25,
  -- Core batting multipliers
  batting_run_points numeric NOT NULL DEFAULT 1,
  batting_four_points numeric NOT NULL DEFAULT 2,
  batting_six_points numeric NOT NULL DEFAULT 3,
  batting_thirty_bonus numeric NOT NULL DEFAULT 5,
  batting_fifty_bonus numeric NOT NULL DEFAULT 10,
  batting_hundred_bonus numeric NOT NULL DEFAULT 20,
  batting_sr_bonus_cap numeric NOT NULL DEFAULT 30,
  batting_sr_bonus_divisor numeric NOT NULL DEFAULT 5,
  -- Core bowling multipliers
  bowling_wicket_points numeric NOT NULL DEFAULT 10,
  bowling_maiden_points numeric NOT NULL DEFAULT 5,
  bowling_threefer_bonus numeric NOT NULL DEFAULT 5,
  bowling_fivefer_bonus numeric NOT NULL DEFAULT 10,
  bowling_noball_penalty numeric NOT NULL DEFAULT 1,
  bowling_wide_penalty numeric NOT NULL DEFAULT 1,
  bowling_eco_target numeric NOT NULL DEFAULT 8,
  bowling_eco_bonus_multiplier numeric NOT NULL DEFAULT 3,
  bowling_eco_bonus_cap numeric NOT NULL DEFAULT 25,
  -- Core fielding multipliers
  fielding_catch_points numeric NOT NULL DEFAULT 5,
  fielding_runout_points numeric NOT NULL DEFAULT 7,
  fielding_stumping_points numeric NOT NULL DEFAULT 7,
  fielding_dropped_catch_penalty numeric NOT NULL DEFAULT 5
);

ALTER TABLE public.scoring_settings ENABLE ROW LEVEL SECURITY;

-- Ensure there is always a row with id=1
INSERT INTO public.scoring_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Public can read scoring settings (needed to render leaderboards consistently)
CREATE POLICY "Public read access for scoring_settings"
ON public.scoring_settings
FOR SELECT
USING (true);

-- Admins can update scoring settings
CREATE POLICY "Admin full access for scoring_settings"
ON public.scoring_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scoring_settings_set_updated_at ON public.scoring_settings;
CREATE TRIGGER scoring_settings_set_updated_at
BEFORE UPDATE ON public.scoring_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime to get instant preview updates across clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.scoring_settings;