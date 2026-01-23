
-- First drop all existing policies and recreate them properly
-- Players table
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Admins can manage players" ON public.players;

CREATE POLICY "Public read access for players" ON public.players
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin full access for players" ON public.players
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Matches table
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can manage matches" ON public.matches;

CREATE POLICY "Public read access for matches" ON public.matches
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin full access for matches" ON public.matches
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Batting inputs table
DROP POLICY IF EXISTS "Anyone can view batting inputs" ON public.batting_inputs;
DROP POLICY IF EXISTS "Admins can manage batting inputs" ON public.batting_inputs;

CREATE POLICY "Public read access for batting_inputs" ON public.batting_inputs
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin full access for batting_inputs" ON public.batting_inputs
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Bowling inputs table
DROP POLICY IF EXISTS "Anyone can view bowling inputs" ON public.bowling_inputs;
DROP POLICY IF EXISTS "Admins can manage bowling inputs" ON public.bowling_inputs;

CREATE POLICY "Public read access for bowling_inputs" ON public.bowling_inputs
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin full access for bowling_inputs" ON public.bowling_inputs
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fielding inputs table
DROP POLICY IF EXISTS "Anyone can view fielding inputs" ON public.fielding_inputs;
DROP POLICY IF EXISTS "Admins can manage fielding inputs" ON public.fielding_inputs;

CREATE POLICY "Public read access for fielding_inputs" ON public.fielding_inputs
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin full access for fielding_inputs" ON public.fielding_inputs
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
