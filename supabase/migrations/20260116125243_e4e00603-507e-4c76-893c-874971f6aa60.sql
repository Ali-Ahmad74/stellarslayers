-- Create point_history table to track daily points for weekly/monthly changes
CREATE TABLE public.point_history (
    id serial PRIMARY KEY,
    player_id integer NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    record_date date NOT NULL DEFAULT CURRENT_DATE,
    batting_points integer NOT NULL DEFAULT 0,
    bowling_points integer NOT NULL DEFAULT 0,
    fielding_points integer NOT NULL DEFAULT 0,
    total_points integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(player_id, record_date)
);

-- Enable RLS
ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for point_history"
ON public.point_history
FOR SELECT
USING (true);

-- Admin full access
CREATE POLICY "Admin full access for point_history"
ON public.point_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_point_history_player_date ON public.point_history(player_id, record_date DESC);