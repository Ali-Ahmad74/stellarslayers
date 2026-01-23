-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- RLS policy for user_roles - users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create players table
CREATE TABLE public.players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    batting_style TEXT,
    bowling_style TEXT,
    role TEXT NOT NULL CHECK (role IN ('Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper')),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Everyone can view players
CREATE POLICY "Anyone can view players"
ON public.players
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can manage players
CREATE POLICY "Admins can manage players"
ON public.players
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create matches table
CREATE TABLE public.matches (
    id SERIAL PRIMARY KEY,
    match_date DATE NOT NULL,
    overs INTEGER NOT NULL DEFAULT 20,
    venue TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Everyone can view matches
CREATE POLICY "Anyone can view matches"
ON public.matches
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can manage matches
CREATE POLICY "Admins can manage matches"
ON public.matches
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create batting_inputs table
CREATE TABLE public.batting_inputs (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    player_id INTEGER REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    runs INTEGER NOT NULL DEFAULT 0,
    balls INTEGER NOT NULL DEFAULT 0,
    fours INTEGER NOT NULL DEFAULT 0,
    sixes INTEGER NOT NULL DEFAULT 0,
    out BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (match_id, player_id)
);

-- Enable RLS on batting_inputs
ALTER TABLE public.batting_inputs ENABLE ROW LEVEL SECURITY;

-- Everyone can view batting inputs
CREATE POLICY "Anyone can view batting inputs"
ON public.batting_inputs
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can manage batting inputs
CREATE POLICY "Admins can manage batting inputs"
ON public.batting_inputs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create bowling_inputs table
CREATE TABLE public.bowling_inputs (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    player_id INTEGER REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    balls INTEGER NOT NULL DEFAULT 0,
    runs_conceded INTEGER NOT NULL DEFAULT 0,
    wickets INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (match_id, player_id)
);

-- Enable RLS on bowling_inputs
ALTER TABLE public.bowling_inputs ENABLE ROW LEVEL SECURITY;

-- Everyone can view bowling inputs
CREATE POLICY "Anyone can view bowling inputs"
ON public.bowling_inputs
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can manage bowling inputs
CREATE POLICY "Admins can manage bowling inputs"
ON public.bowling_inputs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create fielding_inputs table
CREATE TABLE public.fielding_inputs (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    player_id INTEGER REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    catches INTEGER NOT NULL DEFAULT 0,
    runouts INTEGER NOT NULL DEFAULT 0,
    stumpings INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (match_id, player_id)
);

-- Enable RLS on fielding_inputs
ALTER TABLE public.fielding_inputs ENABLE ROW LEVEL SECURITY;

-- Everyone can view fielding inputs
CREATE POLICY "Anyone can view fielding inputs"
ON public.fielding_inputs
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can manage fielding inputs
CREATE POLICY "Admins can manage fielding inputs"
ON public.fielding_inputs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create player_stats view for aggregated stats
CREATE VIEW public.player_stats AS
SELECT 
    p.id AS player_id,
    COUNT(DISTINCT b.match_id) AS matches,
    COALESCE(SUM(b.runs), 0) AS total_runs,
    COALESCE(SUM(b.balls), 0) AS total_balls,
    COALESCE(SUM(b.fours), 0) AS fours,
    COALESCE(SUM(b.sixes), 0) AS sixes,
    COALESCE(SUM(CASE WHEN b.out THEN 1 ELSE 0 END), 0) AS times_out,
    COALESCE(SUM(bo.balls), 0) AS bowling_balls,
    COALESCE(SUM(bo.runs_conceded), 0) AS runs_conceded,
    COALESCE(SUM(bo.wickets), 0) AS wickets,
    COALESCE(SUM(f.catches), 0) AS catches,
    COALESCE(SUM(f.runouts), 0) AS runouts,
    COALESCE(SUM(f.stumpings), 0) AS stumpings
FROM public.players p
LEFT JOIN public.batting_inputs b ON p.id = b.player_id
LEFT JOIN public.bowling_inputs bo ON p.id = bo.player_id AND b.match_id = bo.match_id
LEFT JOIN public.fielding_inputs f ON p.id = f.player_id AND b.match_id = f.match_id
GROUP BY p.id;

-- Create function to calculate player ratings
CREATE OR REPLACE FUNCTION public.calculate_player_ratings(p_player_id INTEGER)
RETURNS TABLE (
    batting_rating NUMERIC,
    bowling_rating NUMERIC,
    fielding_rating NUMERIC,
    allrounder_rating NUMERIC,
    overall_rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stats RECORD;
    v_batting NUMERIC := 0;
    v_bowling NUMERIC := 0;
    v_fielding NUMERIC := 0;
BEGIN
    SELECT * INTO v_stats FROM public.player_stats WHERE player_id = p_player_id;
    
    IF v_stats IS NULL THEN
        RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Batting rating calculation
    IF v_stats.total_balls > 0 THEN
        v_batting := LEAST(100, (
            (v_stats.total_runs * 0.5) + 
            ((v_stats.total_runs::NUMERIC / NULLIF(v_stats.total_balls, 0)) * 50) +
            (v_stats.fours * 2) + 
            (v_stats.sixes * 4) -
            (v_stats.times_out * 3)
        ));
    END IF;
    
    -- Bowling rating calculation
    IF v_stats.bowling_balls > 0 THEN
        v_bowling := LEAST(100, (
            (v_stats.wickets * 15) -
            ((v_stats.runs_conceded::NUMERIC / NULLIF(v_stats.bowling_balls, 0)) * 20) +
            30
        ));
    END IF;
    
    -- Fielding rating calculation
    v_fielding := LEAST(100, (
        (v_stats.catches * 10) +
        (v_stats.runouts * 12) +
        (v_stats.stumpings * 15)
    ));
    
    -- Ensure non-negative values
    v_batting := GREATEST(0, v_batting);
    v_bowling := GREATEST(0, v_bowling);
    v_fielding := GREATEST(0, v_fielding);
    
    RETURN QUERY SELECT 
        ROUND(v_batting, 1),
        ROUND(v_bowling, 1),
        ROUND(v_fielding, 1),
        ROUND((v_batting + v_bowling) / 2, 1),
        ROUND((v_batting * 0.4 + v_bowling * 0.35 + v_fielding * 0.25), 1);
END;
$$;