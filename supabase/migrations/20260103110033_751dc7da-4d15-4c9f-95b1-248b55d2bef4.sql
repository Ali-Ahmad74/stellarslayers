
-- Drop existing restrictive policies and recreate as permissive
-- Players table
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
CREATE POLICY "Anyone can view players" ON public.players
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage players" ON public.players;
CREATE POLICY "Admins can manage players" ON public.players
FOR ALL USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Matches table
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
CREATE POLICY "Anyone can view matches" ON public.matches
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage matches" ON public.matches;
CREATE POLICY "Admins can manage matches" ON public.matches
FOR ALL USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Batting inputs table
DROP POLICY IF EXISTS "Anyone can view batting inputs" ON public.batting_inputs;
CREATE POLICY "Anyone can view batting inputs" ON public.batting_inputs
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage batting inputs" ON public.batting_inputs;
CREATE POLICY "Admins can manage batting inputs" ON public.batting_inputs
FOR ALL USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Bowling inputs table
DROP POLICY IF EXISTS "Anyone can view bowling inputs" ON public.bowling_inputs;
CREATE POLICY "Anyone can view bowling inputs" ON public.bowling_inputs
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage bowling inputs" ON public.bowling_inputs;
CREATE POLICY "Admins can manage bowling inputs" ON public.bowling_inputs
FOR ALL USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fielding inputs table
DROP POLICY IF EXISTS "Anyone can view fielding inputs" ON public.fielding_inputs;
CREATE POLICY "Anyone can view fielding inputs" ON public.fielding_inputs
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage fielding inputs" ON public.fielding_inputs;
CREATE POLICY "Admins can manage fielding inputs" ON public.fielding_inputs
FOR ALL USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
