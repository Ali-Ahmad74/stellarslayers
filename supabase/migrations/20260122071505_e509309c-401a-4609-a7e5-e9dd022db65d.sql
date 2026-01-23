-- Create function to auto-assign season_id based on match date
CREATE OR REPLACE FUNCTION public.assign_season_id()
RETURNS TRIGGER AS $$
DECLARE
  match_date_val DATE;
  season_id_val INTEGER;
BEGIN
  -- Get the match date
  SELECT match_date INTO match_date_val
  FROM public.matches
  WHERE id = NEW.match_id;
  
  -- Find the season that contains this match date
  SELECT id INTO season_id_val
  FROM public.seasons
  WHERE (start_date IS NULL OR match_date_val >= start_date)
    AND (end_date IS NULL OR match_date_val <= end_date)
  ORDER BY year DESC
  LIMIT 1;
  
  -- If no date-based season found, try to find active season
  IF season_id_val IS NULL THEN
    SELECT id INTO season_id_val
    FROM public.seasons
    WHERE is_active = true
    LIMIT 1;
  END IF;
  
  -- Assign the season_id
  NEW.season_id := season_id_val;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for batting_inputs
DROP TRIGGER IF EXISTS assign_season_id_batting ON public.batting_inputs;
CREATE TRIGGER assign_season_id_batting
  BEFORE INSERT ON public.batting_inputs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_season_id();

-- Create triggers for bowling_inputs
DROP TRIGGER IF EXISTS assign_season_id_bowling ON public.bowling_inputs;
CREATE TRIGGER assign_season_id_bowling
  BEFORE INSERT ON public.bowling_inputs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_season_id();

-- Create triggers for fielding_inputs
DROP TRIGGER IF EXISTS assign_season_id_fielding ON public.fielding_inputs;
CREATE TRIGGER assign_season_id_fielding
  BEFORE INSERT ON public.fielding_inputs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_season_id();