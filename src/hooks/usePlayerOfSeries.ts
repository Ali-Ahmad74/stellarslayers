import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MatchPerformance, calculateMatchPoints } from "@/lib/performancePoints";

export interface SeriesPlayerStats {
  player_id: number;
  total_points: number;
  matches_played: number;
  total_runs: number;
  total_wickets: number;
  total_catches: number;
}

/**
 * Fetches all performances for matches in a series and calculates Player of the Series
 */
export function usePlayerOfSeries(seriesId: number | null | undefined) {
  return useQuery({
    queryKey: ["player-of-series", seriesId],
    queryFn: async () => {
      if (!seriesId) return { playerOfSeries: null, leaderboard: [] };

      // Get all match IDs in this series
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .eq("series_id", seriesId);

      const matchIds = (matches ?? []).map((m) => m.id);
      if (matchIds.length === 0) return { playerOfSeries: null, leaderboard: [] };

      const [{ data: batting }, { data: bowling }, { data: fielding }] = await Promise.all([
        supabase.from("batting_inputs").select("match_id, player_id, runs, balls, fours, sixes, out").in("match_id", matchIds),
        supabase.from("bowling_inputs").select("match_id, player_id, wickets, runs_conceded, balls, maidens, dot_balls").in("match_id", matchIds),
        supabase.from("fielding_inputs").select("match_id, player_id, catches, runouts, stumpings").in("match_id", matchIds),
      ]);

      // Aggregate by player across all matches
      const playerStats = new Map<number, SeriesPlayerStats>();

      const ensurePlayer = (pid: number) => {
        if (!playerStats.has(pid)) {
          playerStats.set(pid, {
            player_id: pid,
            total_points: 0,
            matches_played: 0,
            total_runs: 0,
            total_wickets: 0,
            total_catches: 0,
          });
        }
        return playerStats.get(pid)!;
      };

      // Group performances by match -> player for point calculation
      const matchPlayerPerf = new Map<number, Map<number, MatchPerformance>>();

      for (const matchId of matchIds) {
        matchPlayerPerf.set(matchId, new Map());
      }

      for (const b of batting ?? []) {
        const matchMap = matchPlayerPerf.get(b.match_id);
        if (!matchMap) continue;
        if (!matchMap.has(b.player_id)) {
          matchMap.set(b.player_id, { player_id: b.player_id });
        }
        const perf = matchMap.get(b.player_id)!;
        perf.batting = {
          runs: b.runs ?? 0,
          balls: b.balls ?? 0,
          fours: b.fours ?? 0,
          sixes: b.sixes ?? 0,
          out: b.out ?? false,
        };
        ensurePlayer(b.player_id).total_runs += b.runs ?? 0;
      }

      for (const b of bowling ?? []) {
        const matchMap = matchPlayerPerf.get(b.match_id);
        if (!matchMap) continue;
        if (!matchMap.has(b.player_id)) {
          matchMap.set(b.player_id, { player_id: b.player_id });
        }
        const perf = matchMap.get(b.player_id)!;
        perf.bowling = {
          wickets: b.wickets ?? 0,
          runs_conceded: b.runs_conceded ?? 0,
          balls: b.balls ?? 0,
          maidens: b.maidens ?? 0,
          dot_balls: b.dot_balls ?? 0,
        };
        ensurePlayer(b.player_id).total_wickets += b.wickets ?? 0;
      }

      for (const f of fielding ?? []) {
        const matchMap = matchPlayerPerf.get(f.match_id);
        if (!matchMap) continue;
        if (!matchMap.has(f.player_id)) {
          matchMap.set(f.player_id, { player_id: f.player_id });
        }
        const perf = matchMap.get(f.player_id)!;
        perf.fielding = {
          catches: f.catches ?? 0,
          runouts: f.runouts ?? 0,
          stumpings: f.stumpings ?? 0,
        };
        ensurePlayer(f.player_id).total_catches += f.catches ?? 0;
      }

      // Calculate points per match and aggregate
      const playerMatches = new Map<number, Set<number>>();

      for (const [matchId, perfMap] of matchPlayerPerf) {
        for (const [playerId, perf] of perfMap) {
          const pts = calculateMatchPoints(perf);
          const stats = ensurePlayer(playerId);
          stats.total_points += pts;

          if (!playerMatches.has(playerId)) {
            playerMatches.set(playerId, new Set());
          }
          playerMatches.get(playerId)!.add(matchId);
        }
      }

      // Set matches played
      for (const [pid, matchSet] of playerMatches) {
        ensurePlayer(pid).matches_played = matchSet.size;
      }

      // Get top performers
      const leaderboard = Array.from(playerStats.values())
        .filter((s) => s.total_points > 0)
        .sort((a, b) => b.total_points - a.total_points);

      // Get player info for the winner
      const playerOfSeries = leaderboard.length > 0 ? leaderboard[0] : null;

      // Fetch player details for leaderboard
      const playerIds = leaderboard.slice(0, 10).map((s) => s.player_id);
      let playersMap = new Map<number, { id: number; name: string; photo_url: string | null; role: string }>();

      if (playerIds.length > 0) {
        const { data: players } = await supabase
          .from("players")
          .select("id, name, photo_url, role")
          .in("id", playerIds);
        for (const p of players ?? []) {
          playersMap.set(p.id, p);
        }
      }

      return {
        playerOfSeries,
        leaderboard: leaderboard.slice(0, 10).map((s) => ({
          ...s,
          player: playersMap.get(s.player_id) ?? null,
        })),
      };
    },
    enabled: !!seriesId,
  });
}
