-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add player_of_the_match column to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS player_of_the_match_id integer REFERENCES public.players(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_potm ON public.matches(player_of_the_match_id) WHERE player_of_the_match_id IS NOT NULL;

-- Create season_awards table for tracking calculated awards
CREATE TABLE IF NOT EXISTS public.season_awards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id integer NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  award_type text NOT NULL,
  player_id integer NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  points numeric NOT NULL DEFAULT 0,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(season_id, award_type)
);

-- Enable RLS on season_awards
ALTER TABLE public.season_awards ENABLE ROW LEVEL SECURITY;

-- Public read access for season_awards
CREATE POLICY "Public read access for season_awards" 
ON public.season_awards 
FOR SELECT 
USING (true);

-- Admin full access for season_awards
CREATE POLICY "Admin full access for season_awards" 
ON public.season_awards 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_season_awards_updated_at
BEFORE UPDATE ON public.season_awards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();