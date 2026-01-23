-- Add season_id to batting_inputs (nullable to support existing data)
ALTER TABLE public.batting_inputs
ADD COLUMN season_id INTEGER REFERENCES public.seasons(id);

-- Create index for faster filtering
CREATE INDEX idx_batting_inputs_season_id ON public.batting_inputs(season_id);

-- Add season_id to fielding_inputs (nullable to support existing data)
ALTER TABLE public.fielding_inputs
ADD COLUMN season_id INTEGER REFERENCES public.seasons(id);

-- Create index for faster filtering
CREATE INDEX idx_fielding_inputs_season_id ON public.fielding_inputs(season_id);