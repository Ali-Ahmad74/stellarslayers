import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MatchPerformance, getBestPerformer } from "@/lib/performancePoints";

/**
 * Fetches all performances for a given match and calculates suggested POTM
 */
export function useMatchPerformances(matchId: number | null | undefined) {
  return useQuery({
    queryKey: ["match-performances", matchId],
    queryFn: async () => {
      if (!matchId) return { performances: [], suggestedPotmId: null };

      const [{ data: batting }, { data: bowling }, { data: fielding }] = await Promise.all([
        supabase.from("batting_inputs").select("player_id, runs, balls, fours, sixes, out").eq("match_id", matchId),
        supabase.from("bowling_inputs").select("player_id, wickets, runs_conceded, balls, maidens, dot_balls").eq("match_id", matchId),
        supabase.from("fielding_inputs").select("player_id, catches, runouts, stumpings").eq("match_id", matchId),
      ]);

      // Aggregate by player
      const playerMap = new Map<number, MatchPerformance>();

      for (const b of batting ?? []) {
        if (!playerMap.has(b.player_id)) {
          playerMap.set(b.player_id, { player_id: b.player_id });
        }
        const p = playerMap.get(b.player_id)!;
        p.batting = {
          runs: b.runs ?? 0,
          balls: b.balls ?? 0,
          fours: b.fours ?? 0,
          sixes: b.sixes ?? 0,
          out: b.out ?? false,
        };
      }

      for (const b of bowling ?? []) {
        if (!playerMap.has(b.player_id)) {
          playerMap.set(b.player_id, { player_id: b.player_id });
        }
        const p = playerMap.get(b.player_id)!;
        p.bowling = {
          wickets: b.wickets ?? 0,
          runs_conceded: b.runs_conceded ?? 0,
          balls: b.balls ?? 0,
          maidens: b.maidens ?? 0,
          dot_balls: b.dot_balls ?? 0,
        };
      }

      for (const f of fielding ?? []) {
        if (!playerMap.has(f.player_id)) {
          playerMap.set(f.player_id, { player_id: f.player_id });
        }
        const p = playerMap.get(f.player_id)!;
        p.fielding = {
          catches: f.catches ?? 0,
          runouts: f.runouts ?? 0,
          stumpings: f.stumpings ?? 0,
        };
      }

      const performances = Array.from(playerMap.values());
      const suggestedPotmId = getBestPerformer(performances);

      return { performances, suggestedPotmId };
    },
    enabled: !!matchId,
  });
}
