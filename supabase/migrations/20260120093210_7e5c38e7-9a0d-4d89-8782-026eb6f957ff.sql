-- Create seasons table
CREATE TABLE public.seasons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on seasons
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Public read access for seasons
CREATE POLICY "Public read access for seasons"
ON public.seasons
FOR SELECT
USING (true);

-- Admin full access for seasons
CREATE POLICY "Admin full access for seasons"
ON public.seasons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add season_id to bowling_inputs (nullable to support existing data)
ALTER TABLE public.bowling_inputs
ADD COLUMN season_id INTEGER REFERENCES public.seasons(id);

-- Create index for faster filtering
CREATE INDEX idx_bowling_inputs_season_id ON public.bowling_inputs(season_id);

-- Enable realtime for seasons table
ALTER PUBLICATION supabase_realtime ADD TABLE public.seasons;