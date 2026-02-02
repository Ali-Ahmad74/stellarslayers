-- Fix player_stats view to use SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.player_stats;

CREATE VIEW public.player_stats
WITH (security_invoker = true)
AS
SELECT p.id AS player_id,
    count(DISTINCT b.match_id) AS matches,
    COALESCE(sum(b.runs), 0::bigint) AS total_runs,
    COALESCE(sum(b.balls), 0::bigint) AS total_balls,
    COALESCE(sum(b.fours), 0::bigint) AS fours,
    COALESCE(sum(b.sixes), 0::bigint) AS sixes,
    COALESCE(sum(
        CASE
            WHEN b."out" THEN 1
            ELSE 0
        END), 0::bigint) AS times_out,
    COALESCE(sum(
        CASE
            WHEN b.runs >= 30 AND b.runs < 50 THEN 1
            ELSE 0
        END), 0::bigint) AS thirties,
    COALESCE(sum(
        CASE
            WHEN b.runs >= 50 AND b.runs < 100 THEN 1
            ELSE 0
        END), 0::bigint) AS fifties,
    COALESCE(sum(
        CASE
            WHEN b.runs >= 100 THEN 1
            ELSE 0
        END), 0::bigint) AS hundreds,
    COALESCE(sum(bo.balls), 0::bigint) AS bowling_balls,
    COALESCE(sum(bo.runs_conceded), 0::bigint) AS runs_conceded,
    COALESCE(sum(bo.wickets), 0::bigint) AS wickets,
    COALESCE(sum(bo.maidens), 0::bigint) AS maidens,
    COALESCE(sum(bo.wides), 0::bigint) AS wides,
    COALESCE(sum(bo.no_balls), 0::bigint) AS no_balls,
    COALESCE(sum(bo.fours_conceded), 0::bigint) AS fours_conceded,
    COALESCE(sum(bo.sixes_conceded), 0::bigint) AS sixes_conceded,
    COALESCE(sum(bo.dot_balls), 0::bigint) AS dot_balls,
    COALESCE(sum(
        CASE
            WHEN bo.wickets >= 3 AND bo.wickets < 5 THEN 1
            ELSE 0
        END), 0::bigint) AS three_fers,
    COALESCE(sum(
        CASE
            WHEN bo.wickets >= 5 THEN 1
            ELSE 0
        END), 0::bigint) AS five_fers,
    COALESCE(sum(f.catches), 0::bigint) AS catches,
    COALESCE(sum(f.runouts), 0::bigint) AS runouts,
    COALESCE(sum(f.stumpings), 0::bigint) AS stumpings,
    COALESCE(sum(f.dropped_catches), 0::bigint) AS dropped_catches
   FROM players p
     LEFT JOIN batting_inputs b ON p.id = b.player_id
     LEFT JOIN bowling_inputs bo ON p.id = bo.player_id
     LEFT JOIN fielding_inputs f ON p.id = f.player_id
  GROUP BY p.id;

-- Fix team_settings_public view to use SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.team_settings_public;

CREATE VIEW public.team_settings_public
WITH (security_invoker = true)
AS
SELECT id,
    team_name,
    team_logo_url,
    description,
    tagline,
    watermark_enabled,
    watermark_handle,
    watermark_position,
    created_at,
    updated_at
   FROM team_settings;