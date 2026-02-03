import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlayerRole } from '@/types/cricket';
import { useScoringSettings } from '@/hooks/useScoringSettings';

interface PlayerStats {
  player_id: number;
  total_runs: number;
  total_balls: number;
  fours: number;
  sixes: number;
  times_out: number;
  thirties: number;
  fifties: number;
  hundreds: number;
  bowling_balls: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
  wides: number;
  no_balls: number;
  three_fers: number;
  five_fers: number;
  catches: number;
  runouts: number;
  stumpings: number;
  dropped_catches: number;
  matches: number;
}

interface Player {
  id: number;
  name: string;
  role: PlayerRole;
  photo_url: string | null;
}

export interface OverallRankingPlayer {
  rank: number;
  id: number;
  name: string;
  role: PlayerRole;
  photo_url: string | null;
  matches: number;
  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  totalPoints: number;
  stats: PlayerStats | null;
}

function calculatePoints(stats: PlayerStats, scoring: any): { battingPoints: number; bowlingPoints: number; fieldingPoints: number; totalPoints: number } {
  const s = scoring ?? {};

  // === BATTING POINTS ===
  let battingPoints = 0;
  if (stats.total_runs > 0 || stats.total_balls > 0) {
    battingPoints += stats.total_runs * Number(s.batting_run_points ?? 1);
    battingPoints += stats.fours * Number(s.batting_four_points ?? 2);
    battingPoints += stats.sixes * Number(s.batting_six_points ?? 3);
    battingPoints += stats.thirties * Number(s.batting_thirty_bonus ?? 5);
    battingPoints += stats.fifties * Number(s.batting_fifty_bonus ?? 10);
    battingPoints += stats.hundreds * Number(s.batting_hundred_bonus ?? 20);

    if (stats.total_balls > 0) {
      const strikeRate = (stats.total_runs / stats.total_balls) * 100;
      const srCap = Number(s.batting_sr_bonus_cap ?? 30);
      const srDiv = Number(s.batting_sr_bonus_divisor ?? 5);
      const srBonus = Math.max(0, Math.min(srCap, (strikeRate - 100) / srDiv));
      battingPoints += srBonus;
    }
  }

  // === BOWLING POINTS ===
  let bowlingPoints = 0;
  if (stats.wickets > 0 || stats.bowling_balls > 0) {
    bowlingPoints += stats.wickets * Number(s.bowling_wicket_points ?? 10);
    bowlingPoints += stats.maidens * Number(s.bowling_maiden_points ?? 5);
    bowlingPoints += stats.three_fers * Number(s.bowling_threefer_bonus ?? 5);
    bowlingPoints += stats.five_fers * Number(s.bowling_fivefer_bonus ?? 10);
    bowlingPoints -= stats.no_balls * Number(s.bowling_noball_penalty ?? 1);
    bowlingPoints -= stats.wides * Number(s.bowling_wide_penalty ?? 1);

    if (stats.bowling_balls > 0) {
      const overs = stats.bowling_balls / 6;
      const economy = stats.runs_conceded / overs;
      const target = Number(s.bowling_eco_target ?? 8);
      const mult = Number(s.bowling_eco_bonus_multiplier ?? 3);
      const cap = Number(s.bowling_eco_bonus_cap ?? 25);
      const ecoBonus = Math.max(0, Math.min(cap, (target - economy) * mult));
      bowlingPoints += ecoBonus;
    }
  }

  // === FIELDING POINTS ===
  let fieldingPoints = 0;
  fieldingPoints += stats.catches * Number(s.fielding_catch_points ?? 5);
  fieldingPoints += stats.runouts * Number(s.fielding_runout_points ?? 7);
  fieldingPoints += stats.stumpings * Number(s.fielding_stumping_points ?? 7);
  fieldingPoints -= stats.dropped_catches * Number(s.fielding_dropped_catch_penalty ?? 5);

  // Ensure non-negative
  battingPoints = Math.max(0, battingPoints);
  bowlingPoints = Math.max(0, bowlingPoints);
  fieldingPoints = Math.max(0, fieldingPoints);

  const bw = Number(s.batting_weight ?? 0.4);
  const boww = Number(s.bowling_weight ?? 0.35);
  const fw = Number(s.fielding_weight ?? 0.25);
  const totalWeighted = battingPoints * bw + bowlingPoints * boww + fieldingPoints * fw;
  const totalPoints = Math.round(totalWeighted * 10) / 10;

  return {
    battingPoints: Math.round(battingPoints * 10) / 10,
    bowlingPoints: Math.round(bowlingPoints * 10) / 10,
    fieldingPoints: Math.round(fieldingPoints * 10) / 10,
    totalPoints,
  };
}

export function useOverallRankingsBySeason(seasonId: string | null) {
  const [rankings, setRankings] = useState<OverallRankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { settings: scoringSettings } = useScoringSettings();

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, role, photo_url');

      if (playersError) throw playersError;

      // Build queries with optional season filter
      let battingQuery = supabase
        .from('batting_inputs')
        .select('player_id, runs, balls, fours, sixes, out, match_id');

      let bowlingQuery = supabase
        .from('bowling_inputs')
        .select('player_id, balls, runs_conceded, wickets, maidens, wides, no_balls, match_id');

      let fieldingQuery = supabase
        .from('fielding_inputs')
        .select('player_id, catches, runouts, stumpings, dropped_catches, match_id');

      if (seasonId && seasonId !== 'all') {
        const seasonIdNum = parseInt(seasonId);
        battingQuery = battingQuery.eq('season_id', seasonIdNum);
        bowlingQuery = bowlingQuery.eq('season_id', seasonIdNum);
        fieldingQuery = fieldingQuery.eq('season_id', seasonIdNum);
      }

      const [battingRes, bowlingRes, fieldingRes] = await Promise.all([
        battingQuery,
        bowlingQuery,
        fieldingQuery,
      ]);

      if (battingRes.error) throw battingRes.error;
      if (bowlingRes.error) throw bowlingRes.error;
      if (fieldingRes.error) throw fieldingRes.error;

      // Aggregate stats per player
      const playerStatsMap = new Map<number, PlayerStats>();
      const playerMatchesMap = new Map<number, Set<number>>();

      const ensureStats = (playerId: number): PlayerStats => {
        let stats = playerStatsMap.get(playerId);
        if (!stats) {
          stats = {
            player_id: playerId,
            total_runs: 0,
            total_balls: 0,
            fours: 0,
            sixes: 0,
            times_out: 0,
            thirties: 0,
            fifties: 0,
            hundreds: 0,
            bowling_balls: 0,
            runs_conceded: 0,
            wickets: 0,
            maidens: 0,
            wides: 0,
            no_balls: 0,
            three_fers: 0,
            five_fers: 0,
            catches: 0,
            runouts: 0,
            stumpings: 0,
            dropped_catches: 0,
            matches: 0,
          };
          playerStatsMap.set(playerId, stats);
        }
        return stats;
      };

      const addMatch = (playerId: number, matchId: number) => {
        if (!playerMatchesMap.has(playerId)) {
          playerMatchesMap.set(playerId, new Set());
        }
        playerMatchesMap.get(playerId)!.add(matchId);
      };

      // Process batting inputs
      for (const row of battingRes.data || []) {
        const stats = ensureStats(row.player_id);
        stats.total_runs += row.runs || 0;
        stats.total_balls += row.balls || 0;
        stats.fours += row.fours || 0;
        stats.sixes += row.sixes || 0;
        if (row.out) stats.times_out += 1;

        const runs = row.runs || 0;
        if (runs >= 100) stats.hundreds += 1;
        else if (runs >= 50) stats.fifties += 1;
        else if (runs >= 30) stats.thirties += 1;

        addMatch(row.player_id, row.match_id);
      }

      // Process bowling inputs
      for (const row of bowlingRes.data || []) {
        const stats = ensureStats(row.player_id);
        stats.bowling_balls += row.balls || 0;
        stats.runs_conceded += row.runs_conceded || 0;
        stats.wickets += row.wickets || 0;
        stats.maidens += row.maidens || 0;
        stats.wides += row.wides || 0;
        stats.no_balls += row.no_balls || 0;

        const wickets = row.wickets || 0;
        if (wickets >= 5) stats.five_fers += 1;
        else if (wickets >= 3) stats.three_fers += 1;

        addMatch(row.player_id, row.match_id);
      }

      // Process fielding inputs
      for (const row of fieldingRes.data || []) {
        const stats = ensureStats(row.player_id);
        stats.catches += row.catches || 0;
        stats.runouts += row.runouts || 0;
        stats.stumpings += row.stumpings || 0;
        stats.dropped_catches += row.dropped_catches || 0;

        addMatch(row.player_id, row.match_id);
      }

      // Update match counts
      for (const [playerId, matches] of playerMatchesMap) {
        const stats = playerStatsMap.get(playerId);
        if (stats) {
          stats.matches = matches.size;
        }
      }

      // Build rankings
      const playersMap = new Map<number, Player>();
      for (const player of playersData || []) {
        playersMap.set(player.id, player as Player);
      }

      const rankingsData: OverallRankingPlayer[] = [];

      for (const [playerId, stats] of playerStatsMap) {
        const player = playersMap.get(playerId);
        if (!player) continue;

        // Only include players with some activity
        if (stats.matches === 0) continue;

        const points = calculatePoints(stats, scoringSettings);

        rankingsData.push({
          rank: 0,
          id: player.id,
          name: player.name,
          role: player.role,
          photo_url: player.photo_url,
          matches: stats.matches,
          battingPoints: points.battingPoints,
          bowlingPoints: points.bowlingPoints,
          fieldingPoints: points.fieldingPoints,
          totalPoints: points.totalPoints,
          stats,
        });
      }

      // Sort by total points descending
      rankingsData.sort((a, b) => b.totalPoints - a.totalPoints);

      // Assign ranks
      const rankedData = rankingsData.map((player, index) => ({
        ...player,
        rank: index + 1,
      }));

      setRankings(rankedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overall rankings');
    } finally {
      setLoading(false);
    }
  }, [seasonId, scoringSettings]);

  useEffect(() => {
    fetchRankings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`overall-rankings-realtime-${seasonId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batting_inputs' }, fetchRankings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bowling_inputs' }, fetchRankings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fielding_inputs' }, fetchRankings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchRankings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scoring_settings' }, fetchRankings)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRankings]);

  return {
    rankings,
    loading,
    error,
    refetch: fetchRankings,
  };
}
