import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OpponentPerformanceRow {
  opponent: string;
  matches: number;
  runs: number;
  balls: number;
  wickets: number;
  catches: number;
  runouts: number;
  stumpings: number;
  average: number;
  strikeRate: number;
  economy: number | null;
  bowlingBalls: number;
  runsConceded: number;
}

export function useOpponentPerformance(playerId: number | undefined) {
  return useQuery({
    queryKey: ["opponent-performance", playerId],
    queryFn: async () => {
      if (!playerId) return [];

      // Get all matches with opponent info
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("id, opponent_name")
        .not("opponent_name", "is", null);

      if (matchesError) throw matchesError;
      if (!matches || matches.length === 0) return [];

      const matchIds = matches.map((m) => m.id);
      const opponentByMatch = new Map(matches.map((m) => [m.id, m.opponent_name ?? "Unknown"]));

      // Fetch player's batting, bowling, fielding for these matches
      const [batRes, bowlRes, fieldRes] = await Promise.all([
        supabase.from("batting_inputs").select("match_id, runs, balls").eq("player_id", playerId).in("match_id", matchIds),
        supabase.from("bowling_inputs").select("match_id, balls, runs_conceded, wickets").eq("player_id", playerId).in("match_id", matchIds),
        supabase.from("fielding_inputs").select("match_id, catches, runouts, stumpings").eq("player_id", playerId).in("match_id", matchIds),
      ]);

      if (batRes.error) throw batRes.error;
      if (bowlRes.error) throw bowlRes.error;
      if (fieldRes.error) throw fieldRes.error;

      // Aggregate by opponent
      const opponentMap = new Map<string, {
        matchIds: Set<number>;
        runs: number;
        balls: number;
        wickets: number;
        catches: number;
        runouts: number;
        stumpings: number;
        bowlingBalls: number;
        runsConceded: number;
      }>();

      const getOrCreate = (opp: string) => {
        if (!opponentMap.has(opp)) {
          opponentMap.set(opp, {
            matchIds: new Set(),
            runs: 0,
            balls: 0,
            wickets: 0,
            catches: 0,
            runouts: 0,
            stumpings: 0,
            bowlingBalls: 0,
            runsConceded: 0,
          });
        }
        return opponentMap.get(opp)!;
      };

      for (const r of batRes.data ?? []) {
        const opp = opponentByMatch.get(r.match_id);
        if (!opp) continue;
        const agg = getOrCreate(opp);
        agg.matchIds.add(r.match_id);
        agg.runs += Number(r.runs ?? 0);
        agg.balls += Number(r.balls ?? 0);
      }

      for (const r of bowlRes.data ?? []) {
        const opp = opponentByMatch.get(r.match_id);
        if (!opp) continue;
        const agg = getOrCreate(opp);
        agg.matchIds.add(r.match_id);
        agg.wickets += Number(r.wickets ?? 0);
        agg.bowlingBalls += Number(r.balls ?? 0);
        agg.runsConceded += Number(r.runs_conceded ?? 0);
      }

      for (const r of fieldRes.data ?? []) {
        const opp = opponentByMatch.get(r.match_id);
        if (!opp) continue;
        const agg = getOrCreate(opp);
        agg.matchIds.add(r.match_id);
        agg.catches += Number(r.catches ?? 0);
        agg.runouts += Number(r.runouts ?? 0);
        agg.stumpings += Number(r.stumpings ?? 0);
      }

      const rows: OpponentPerformanceRow[] = [...opponentMap.entries()].map(([opponent, agg]) => ({
        opponent,
        matches: agg.matchIds.size,
        runs: agg.runs,
        balls: agg.balls,
        wickets: agg.wickets,
        catches: agg.catches,
        runouts: agg.runouts,
        stumpings: agg.stumpings,
        bowlingBalls: agg.bowlingBalls,
        runsConceded: agg.runsConceded,
        average: agg.matchIds.size > 0 ? Math.round((agg.runs / agg.matchIds.size) * 10) / 10 : 0,
        strikeRate: agg.balls > 0 ? Math.round((agg.runs / agg.balls) * 1000) / 10 : 0,
        economy: agg.bowlingBalls > 0 ? Math.round((agg.runsConceded / (agg.bowlingBalls / 6)) * 100) / 100 : null,
      }));

      return rows.filter((r) => r.matches > 0).sort((a, b) => b.matches - a.matches);
    },
    enabled: !!playerId,
  });
}
