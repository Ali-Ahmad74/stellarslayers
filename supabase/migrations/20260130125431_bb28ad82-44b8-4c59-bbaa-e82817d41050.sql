-- 1. Create a secure public view for team_settings that excludes admin_owner_user_id
CREATE OR REPLACE VIEW public.team_settings_public AS
SELECT 
  id,
  team_name,
  team_logo_url,
  description,
  tagline,
  watermark_enabled,
  watermark_handle,
  watermark_position,
  created_at,
  updated_at
FROM public.team_settings;

-- Grant SELECT on the public view
GRANT SELECT ON public.team_settings_public TO anon, authenticated;

-- 2. Fix player_stats view - add public read policy
-- Note: player_stats is a VIEW, we need to ensure it has proper access
-- The view already exists, just need to grant access
GRANT SELECT ON public.player_stats TO anon, authenticated;

-- 3. Change calculate_player_ratings from SECURITY DEFINER to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.calculate_player_ratings(p_player_id integer)
 RETURNS TABLE(batting_rating numeric, bowling_rating numeric, fielding_rating numeric, allrounder_rating numeric, overall_rating numeric)
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
$function$;