-- Fix the player_stats view to properly aggregate stats without cross-join multiplication
DROP VIEW IF EXISTS player_stats;

CREATE OR REPLACE VIEW player_stats AS
WITH batting_agg AS (
  SELECT 
    player_id,
    COUNT(DISTINCT match_id) AS matches,
    COALESCE(SUM(runs), 0) AS total_runs,
    COALESCE(SUM(balls), 0) AS total_balls,
    COALESCE(SUM(fours), 0) AS fours,
    COALESCE(SUM(sixes), 0) AS sixes,
    COALESCE(SUM(CASE WHEN out THEN 1 ELSE 0 END), 0) AS times_out,
    COALESCE(SUM(CASE WHEN runs >= 30 AND runs < 50 THEN 1 ELSE 0 END), 0) AS thirties,
    COALESCE(SUM(CASE WHEN runs >= 50 AND runs < 100 THEN 1 ELSE 0 END), 0) AS fifties,
    COALESCE(SUM(CASE WHEN runs >= 100 THEN 1 ELSE 0 END), 0) AS hundreds
  FROM batting_inputs
  GROUP BY player_id
),
bowling_agg AS (
  SELECT 
    player_id,
    COALESCE(SUM(balls), 0) AS bowling_balls,
    COALESCE(SUM(runs_conceded), 0) AS runs_conceded,
    COALESCE(SUM(wickets), 0) AS wickets,
    COALESCE(SUM(maidens), 0) AS maidens,
    COALESCE(SUM(wides), 0) AS wides,
    COALESCE(SUM(no_balls), 0) AS no_balls,
    COALESCE(SUM(fours_conceded), 0) AS fours_conceded,
    COALESCE(SUM(sixes_conceded), 0) AS sixes_conceded,
    COALESCE(SUM(dot_balls), 0) AS dot_balls,
    COALESCE(SUM(CASE WHEN wickets >= 3 AND wickets < 5 THEN 1 ELSE 0 END), 0) AS three_fers,
    COALESCE(SUM(CASE WHEN wickets >= 5 THEN 1 ELSE 0 END), 0) AS five_fers
  FROM bowling_inputs
  GROUP BY player_id
),
fielding_agg AS (
  SELECT 
    player_id,
    COALESCE(SUM(catches), 0) AS catches,
    COALESCE(SUM(runouts), 0) AS runouts,
    COALESCE(SUM(stumpings), 0) AS stumpings,
    COALESCE(SUM(dropped_catches), 0) AS dropped_catches
  FROM fielding_inputs
  GROUP BY player_id
),
all_matches AS (
  SELECT player_id, match_id FROM batting_inputs
  UNION
  SELECT player_id, match_id FROM bowling_inputs
  UNION
  SELECT player_id, match_id FROM fielding_inputs
),
match_counts AS (
  SELECT player_id, COUNT(DISTINCT match_id) AS matches
  FROM all_matches
  GROUP BY player_id
)
SELECT 
  p.id AS player_id,
  COALESCE(mc.matches, 0) AS matches,
  COALESCE(ba.total_runs, 0) AS total_runs,
  COALESCE(ba.total_balls, 0) AS total_balls,
  COALESCE(ba.fours, 0) AS fours,
  COALESCE(ba.sixes, 0) AS sixes,
  COALESCE(ba.times_out, 0) AS times_out,
  COALESCE(ba.thirties, 0) AS thirties,
  COALESCE(ba.fifties, 0) AS fifties,
  COALESCE(ba.hundreds, 0) AS hundreds,
  COALESCE(bo.bowling_balls, 0) AS bowling_balls,
  COALESCE(bo.runs_conceded, 0) AS runs_conceded,
  COALESCE(bo.wickets, 0) AS wickets,
  COALESCE(bo.maidens, 0) AS maidens,
  COALESCE(bo.wides, 0) AS wides,
  COALESCE(bo.no_balls, 0) AS no_balls,
  COALESCE(bo.fours_conceded, 0) AS fours_conceded,
  COALESCE(bo.sixes_conceded, 0) AS sixes_conceded,
  COALESCE(bo.dot_balls, 0) AS dot_balls,
  COALESCE(bo.three_fers, 0) AS three_fers,
  COALESCE(bo.five_fers, 0) AS five_fers,
  COALESCE(fa.catches, 0) AS catches,
  COALESCE(fa.runouts, 0) AS runouts,
  COALESCE(fa.stumpings, 0) AS stumpings,
  COALESCE(fa.dropped_catches, 0) AS dropped_catches
FROM players p
LEFT JOIN match_counts mc ON p.id = mc.player_id
LEFT JOIN batting_agg ba ON p.id = ba.player_id
LEFT JOIN bowling_agg bo ON p.id = bo.player_id
LEFT JOIN fielding_agg fa ON p.id = fa.player_id;