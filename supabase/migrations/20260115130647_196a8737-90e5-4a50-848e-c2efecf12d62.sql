-- Add new columns to bowling_inputs for fours_conceded and sixes_conceded
ALTER TABLE public.bowling_inputs
ADD COLUMN IF NOT EXISTS fours_conceded integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sixes_conceded integer NOT NULL DEFAULT 0;

-- Add dropped_catches to fielding_inputs
ALTER TABLE public.fielding_inputs
ADD COLUMN IF NOT EXISTS dropped_catches integer NOT NULL DEFAULT 0;

-- Drop and recreate the player_stats view with all new fields and milestone calculations
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
    -- Batting milestones: count innings with 30+, 50+, 100+ runs
    COALESCE((SELECT COUNT(*) FROM batting_inputs WHERE player_id = p.id AND runs >= 30 AND runs < 50), 0) AS thirties,
    COALESCE((SELECT COUNT(*) FROM batting_inputs WHERE player_id = p.id AND runs >= 50 AND runs < 100), 0) AS fifties,
    COALESCE((SELECT COUNT(*) FROM batting_inputs WHERE player_id = p.id AND runs >= 100), 0) AS hundreds,
    -- Bowling stats
    COALESCE((SELECT SUM(balls) FROM bowling_inputs WHERE player_id = p.id), 0) AS bowling_balls,
    COALESCE((SELECT SUM(runs_conceded) FROM bowling_inputs WHERE player_id = p.id), 0) AS runs_conceded,
    COALESCE((SELECT SUM(wickets) FROM bowling_inputs WHERE player_id = p.id), 0) AS wickets,
    COALESCE((SELECT SUM(maidens) FROM bowling_inputs WHERE player_id = p.id), 0) AS maidens,
    COALESCE((SELECT SUM(wides) FROM bowling_inputs WHERE player_id = p.id), 0) AS wides,
    COALESCE((SELECT SUM(no_balls) FROM bowling_inputs WHERE player_id = p.id), 0) AS no_balls,
    COALESCE((SELECT SUM(fours_conceded) FROM bowling_inputs WHERE player_id = p.id), 0) AS fours_conceded,
    COALESCE((SELECT SUM(sixes_conceded) FROM bowling_inputs WHERE player_id = p.id), 0) AS sixes_conceded,
    -- Bowling milestones: 3+ wickets (3fer), 5+ wickets (5fer)
    COALESCE((SELECT COUNT(*) FROM bowling_inputs WHERE player_id = p.id AND wickets >= 3 AND wickets < 5), 0) AS three_fers,
    COALESCE((SELECT COUNT(*) FROM bowling_inputs WHERE player_id = p.id AND wickets >= 5), 0) AS five_fers,
    -- Fielding stats
    COALESCE((SELECT SUM(catches) FROM fielding_inputs WHERE player_id = p.id), 0) AS catches,
    COALESCE((SELECT SUM(runouts) FROM fielding_inputs WHERE player_id = p.id), 0) AS runouts,
    COALESCE((SELECT SUM(stumpings) FROM fielding_inputs WHERE player_id = p.id), 0) AS stumpings,
    COALESCE((SELECT SUM(dropped_catches) FROM fielding_inputs WHERE player_id = p.id), 0) AS dropped_catches
FROM players p;