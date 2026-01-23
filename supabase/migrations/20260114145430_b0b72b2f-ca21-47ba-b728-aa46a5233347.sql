-- Drop the existing view and recreate with proper LEFT JOIN logic
DROP VIEW IF EXISTS public.player_stats;

CREATE VIEW public.player_stats AS
SELECT 
    p.id AS player_id,
    -- Matches: count distinct matches from ALL input tables
    (
        SELECT COUNT(DISTINCT match_id) 
        FROM (
            SELECT match_id FROM batting_inputs WHERE player_id = p.id
            UNION
            SELECT match_id FROM bowling_inputs WHERE player_id = p.id
            UNION
            SELECT match_id FROM fielding_inputs WHERE player_id = p.id
        ) all_matches
    ) AS matches,
    -- Batting stats
    COALESCE((SELECT SUM(runs) FROM batting_inputs WHERE player_id = p.id), 0) AS total_runs,
    COALESCE((SELECT SUM(balls) FROM batting_inputs WHERE player_id = p.id), 0) AS total_balls,
    COALESCE((SELECT SUM(fours) FROM batting_inputs WHERE player_id = p.id), 0) AS fours,
    COALESCE((SELECT SUM(sixes) FROM batting_inputs WHERE player_id = p.id), 0) AS sixes,
    COALESCE((SELECT SUM(CASE WHEN out THEN 1 ELSE 0 END) FROM batting_inputs WHERE player_id = p.id), 0) AS times_out,
    -- Bowling stats
    COALESCE((SELECT SUM(balls) FROM bowling_inputs WHERE player_id = p.id), 0) AS bowling_balls,
    COALESCE((SELECT SUM(runs_conceded) FROM bowling_inputs WHERE player_id = p.id), 0) AS runs_conceded,
    COALESCE((SELECT SUM(wickets) FROM bowling_inputs WHERE player_id = p.id), 0) AS wickets,
    COALESCE((SELECT SUM(maidens) FROM bowling_inputs WHERE player_id = p.id), 0) AS maidens,
    COALESCE((SELECT SUM(wides) FROM bowling_inputs WHERE player_id = p.id), 0) AS wides,
    COALESCE((SELECT SUM(no_balls) FROM bowling_inputs WHERE player_id = p.id), 0) AS no_balls,
    -- Fielding stats
    COALESCE((SELECT SUM(catches) FROM fielding_inputs WHERE player_id = p.id), 0) AS catches,
    COALESCE((SELECT SUM(runouts) FROM fielding_inputs WHERE player_id = p.id), 0) AS runouts,
    COALESCE((SELECT SUM(stumpings) FROM fielding_inputs WHERE player_id = p.id), 0) AS stumpings
FROM players p;