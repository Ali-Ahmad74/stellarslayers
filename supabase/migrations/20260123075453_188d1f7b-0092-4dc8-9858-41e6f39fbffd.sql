-- Create tournaments table
CREATE TABLE public.tournaments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  venue TEXT,
  tournament_type TEXT DEFAULT 'league', -- league, knockout, group_stage
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add tournament_id to matches table
ALTER TABLE public.matches 
ADD COLUMN tournament_id INTEGER REFERENCES public.tournaments(id) ON DELETE SET NULL;

-- Enable RLS on tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Public read access for tournaments
CREATE POLICY "Public read access for tournaments"
ON public.tournaments
FOR SELECT
USING (true);

-- Admin full access for tournaments
CREATE POLICY "Admin full access for tournaments"
ON public.tournaments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));