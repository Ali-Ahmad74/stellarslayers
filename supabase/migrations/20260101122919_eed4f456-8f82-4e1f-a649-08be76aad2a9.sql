-- Fix security definer view warning by dropping and recreating without security definer
DROP VIEW IF EXISTS public.player_stats;

-- Create player_stats as a regular view (inherits RLS from underlying tables)
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