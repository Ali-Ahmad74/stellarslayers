-- Live Match State Table - stores current match state for realtime updates
CREATE TABLE public.live_match_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id INTEGER REFERENCES public.matches(id) ON DELETE CASCADE,
  is_live BOOLEAN DEFAULT false,
  current_innings INTEGER DEFAULT 1,
  total_runs INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  overs INTEGER DEFAULT 0,
  balls INTEGER DEFAULT 0,
  current_striker_id INTEGER REFERENCES public.players(id),
  current_non_striker_id INTEGER REFERENCES public.players(id),
  current_bowler_id INTEGER REFERENCES public.players(id),
  target INTEGER,
  match_status TEXT DEFAULT 'not_started', -- 'not_started', 'live', 'innings_break', 'completed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id)
);

-- Ball by Ball Table - stores every delivery for commentary and stats
CREATE TABLE public.ball_by_ball (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id INTEGER NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings INTEGER DEFAULT 1,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  batsman_id INTEGER REFERENCES public.players(id),
  bowler_id INTEGER REFERENCES public.players(id),
  runs_scored INTEGER DEFAULT 0,
  extras_type TEXT, -- 'wide', 'noball', 'bye', 'legbye', null for normal delivery
  extras_runs INTEGER DEFAULT 0,
  is_wicket BOOLEAN DEFAULT false,
  wicket_type TEXT, -- 'caught', 'bowled', 'lbw', 'runout', 'stumped', 'hitwicket'
  fielder_id INTEGER REFERENCES public.players(id),
  is_boundary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.live_match_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ball_by_ball ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_match_state
CREATE POLICY "Public read access for live_match_state"
ON public.live_match_state
FOR SELECT
USING (true);

CREATE POLICY "Admin full access for live_match_state"
ON public.live_match_state
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ball_by_ball
CREATE POLICY "Public read access for ball_by_ball"
ON public.ball_by_ball
FOR SELECT
USING (true);

CREATE POLICY "Admin full access for ball_by_ball"
ON public.ball_by_ball
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on live_match_state
CREATE TRIGGER update_live_match_state_updated_at
BEFORE UPDATE ON public.live_match_state
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Create index for faster queries
CREATE INDEX idx_ball_by_ball_match_id ON public.ball_by_ball(match_id);
CREATE INDEX idx_ball_by_ball_innings ON public.ball_by_ball(match_id, innings);
CREATE INDEX idx_live_match_state_is_live ON public.live_match_state(is_live) WHERE is_live = true;

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_match_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ball_by_ball;