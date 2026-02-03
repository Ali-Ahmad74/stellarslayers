import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeasonAward {
  id: string;
  season_id: number;
  season_name: string;
  award_type: string;
  player_id: number;
  player_name: string;
  player_photo_url: string | null;
  points: number;
  stats: Record<string, any>;
}

export function useSeasonAwards(seasonId?: number) {
  return useQuery({
    queryKey: ["season-awards", seasonId],
    queryFn: async () => {
      let query = supabase
        .from("season_awards")
        .select("id, season_id, award_type, player_id, points, stats, seasons(name), players(name, photo_url)")
        .order("season_id", { ascending: false });

      if (seasonId) {
        query = query.eq("season_id", seasonId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        season_id: row.season_id,
        season_name: row.seasons?.name ?? `Season ${row.season_id}`,
        award_type: row.award_type,
        player_id: row.player_id,
        player_name: row.players?.name ?? "Unknown",
        player_photo_url: row.players?.photo_url ?? null,
        points: Number(row.points ?? 0),
        stats: row.stats ?? {},
      })) as SeasonAward[];
    },
  });
}

// Calculate and save season awards
export async function calculateSeasonAwards(seasonId: number): Promise<void> {
  // Get all matches for this season via their inputs
  const { data: batInputs, error: batErr } = await supabase
    .from("batting_inputs")
    .select("player_id, runs, balls, fours, sixes")
    .eq("season_id", seasonId);

  if (batErr) throw batErr;

  const { data: bowlInputs, error: bowlErr } = await supabase
    .from("bowling_inputs")
    .select("player_id, balls, runs_conceded, wickets, maidens")
    .eq("season_id", seasonId);

  if (bowlErr) throw bowlErr;

  const { data: fieldInputs, error: fieldErr } = await supabase
    .from("fielding_inputs")
    .select("player_id, catches, runouts, stumpings")
    .eq("season_id", seasonId);

  if (fieldErr) throw fieldErr;

  // Aggregate batting
  const batAgg = new Map<number, { runs: number; balls: number; fours: number; sixes: number; innings: number }>();
  for (const r of batInputs ?? []) {
    const existing = batAgg.get(r.player_id) ?? { runs: 0, balls: 0, fours: 0, sixes: 0, innings: 0 };
    batAgg.set(r.player_id, {
      runs: existing.runs + Number(r.runs ?? 0),
      balls: existing.balls + Number(r.balls ?? 0),
      fours: existing.fours + Number(r.fours ?? 0),
      sixes: existing.sixes + Number(r.sixes ?? 0),
      innings: existing.innings + 1,
    });
  }

  // Aggregate bowling
  const bowlAgg = new Map<number, { wickets: number; balls: number; runsConceded: number; maidens: number; innings: number }>();
  for (const r of bowlInputs ?? []) {
    const existing = bowlAgg.get(r.player_id) ?? { wickets: 0, balls: 0, runsConceded: 0, maidens: 0, innings: 0 };
    bowlAgg.set(r.player_id, {
      wickets: existing.wickets + Number(r.wickets ?? 0),
      balls: existing.balls + Number(r.balls ?? 0),
      runsConceded: existing.runsConceded + Number(r.runs_conceded ?? 0),
      maidens: existing.maidens + Number(r.maidens ?? 0),
      innings: existing.innings + 1,
    });
  }

  // Aggregate fielding
  const fieldAgg = new Map<number, { catches: number; runouts: number; stumpings: number; contributions: number }>();
  for (const r of fieldInputs ?? []) {
    const existing = fieldAgg.get(r.player_id) ?? { catches: 0, runouts: 0, stumpings: 0, contributions: 0 };
    const contrib = Number(r.catches ?? 0) + Number(r.runouts ?? 0) + Number(r.stumpings ?? 0);
    fieldAgg.set(r.player_id, {
      catches: existing.catches + Number(r.catches ?? 0),
      runouts: existing.runouts + Number(r.runouts ?? 0),
      stumpings: existing.stumpings + Number(r.stumpings ?? 0),
      contributions: existing.contributions + contrib,
    });
  }

  // Find winners
  let bestBatsman: { player_id: number; points: number; stats: any } | null = null;
  for (const [player_id, stats] of batAgg) {
    const points = stats.runs;
    if (!bestBatsman || points > bestBatsman.points) {
      bestBatsman = { player_id, points, stats };
    }
  }

  let bestBowler: { player_id: number; points: number; stats: any } | null = null;
  for (const [player_id, stats] of bowlAgg) {
    const points = stats.wickets;
    if (!bestBowler || points > bestBowler.points) {
      bestBowler = { player_id, points, stats };
    }
  }

  let bestFielder: { player_id: number; points: number; stats: any } | null = null;
  for (const [player_id, stats] of fieldAgg) {
    const points = stats.contributions;
    if (!bestFielder || points > bestFielder.points) {
      bestFielder = { player_id, points, stats };
    }
  }

  // Upsert awards
  const upserts = [];

  if (bestBatsman) {
    upserts.push({
      season_id: seasonId,
      award_type: "batsman_of_season",
      player_id: bestBatsman.player_id,
      points: bestBatsman.points,
      stats: bestBatsman.stats,
    });
  }

  if (bestBowler) {
    upserts.push({
      season_id: seasonId,
      award_type: "bowler_of_season",
      player_id: bestBowler.player_id,
      points: bestBowler.points,
      stats: bestBowler.stats,
    });
  }

  if (bestFielder) {
    upserts.push({
      season_id: seasonId,
      award_type: "fielder_of_season",
      player_id: bestFielder.player_id,
      points: bestFielder.points,
      stats: bestFielder.stats,
    });
  }

  if (upserts.length > 0) {
    const { error } = await supabase.from("season_awards").upsert(upserts, {
      onConflict: "season_id,award_type",
    });
    if (error) throw error;
  }
}
