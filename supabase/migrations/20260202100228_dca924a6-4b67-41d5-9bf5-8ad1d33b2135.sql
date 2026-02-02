-- Add dot_balls column to bowling_inputs table
ALTER TABLE public.bowling_inputs 
ADD COLUMN IF NOT EXISTS dot_balls integer NOT NULL DEFAULT 0;

-- Drop and recreate the player_stats view to include dot_balls
DROP VIEW IF EXISTS public.player_stats;

CREATE VIEW public.player_stats AS
SELECT 
    p.id AS player_id,
    COUNT(DISTINCT b.match_id) AS matches,
    COALESCE(SUM(b.runs), 0) AS total_runs,
    COALESCE(SUM(b.balls), 0) AS total_balls,
    COALESCE(SUM(b.fours), 0) AS fours,
    COALESCE(SUM(b.sixes), 0) AS sixes,
    COALESCE(SUM(CASE WHEN b.out THEN 1 ELSE 0 END), 0) AS times_out,
    COALESCE(SUM(CASE WHEN b.runs >= 30 AND b.runs < 50 THEN 1 ELSE 0 END), 0) AS thirties,
    COALESCE(SUM(CASE WHEN b.runs >= 50 AND b.runs < 100 THEN 1 ELSE 0 END), 0) AS fifties,
    COALESCE(SUM(CASE WHEN b.runs >= 100 THEN 1 ELSE 0 END), 0) AS hundreds,
    COALESCE(SUM(bo.balls), 0) AS bowling_balls,
    COALESCE(SUM(bo.runs_conceded), 0) AS runs_conceded,
    COALESCE(SUM(bo.wickets), 0) AS wickets,
    COALESCE(SUM(bo.maidens), 0) AS maidens,
    COALESCE(SUM(bo.wides), 0) AS wides,
    COALESCE(SUM(bo.no_balls), 0) AS no_balls,
    COALESCE(SUM(bo.fours_conceded), 0) AS fours_conceded,
    COALESCE(SUM(bo.sixes_conceded), 0) AS sixes_conceded,
    COALESCE(SUM(bo.dot_balls), 0) AS dot_balls,
    COALESCE(SUM(CASE WHEN bo.wickets >= 3 AND bo.wickets < 5 THEN 1 ELSE 0 END), 0) AS three_fers,
    COALESCE(SUM(CASE WHEN bo.wickets >= 5 THEN 1 ELSE 0 END), 0) AS five_fers,
    COALESCE(SUM(f.catches), 0) AS catches,
    COALESCE(SUM(f.runouts), 0) AS runouts,
    COALESCE(SUM(f.stumpings), 0) AS stumpings,
    COALESCE(SUM(f.dropped_catches), 0) AS dropped_catches
FROM public.players p
LEFT JOIN public.batting_inputs b ON p.id = b.player_id
LEFT JOIN public.bowling_inputs bo ON p.id = bo.player_id
LEFT JOIN public.fielding_inputs f ON p.id = f.player_id
GROUP BY p.id;