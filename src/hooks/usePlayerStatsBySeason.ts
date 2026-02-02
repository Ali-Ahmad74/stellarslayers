import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlayerStats as PlayerStatsType } from '@/hooks/usePlayerRankings';

interface UsePlayerStatsBySeasonResult {
  stats: PlayerStatsType | null;
  battingRecords: any[];
  bowlingRecords: any[];
  loading: boolean;
  error: string | null;
}

export function usePlayerStatsBySeason(
  playerId: number | null,
  selectedSeasonId: string
): UsePlayerStatsBySeasonResult {
  const [stats, setStats] = useState<PlayerStatsType | null>(null);
  const [battingRecords, setBattingRecords] = useState<any[]>([]);
  const [bowlingRecords, setBowlingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build queries with optional season filter
      let battingQuery = supabase
        .from('batting_inputs')
        .select('*, matches!inner(match_date)')
        .eq('player_id', playerId);

      let bowlingQuery = supabase
        .from('bowling_inputs')
        .select('*, matches!inner(match_date)')
        .eq('player_id', playerId);

      let fieldingQuery = supabase
        .from('fielding_inputs')
        .select('*, matches!inner(match_date)')
        .eq('player_id', playerId);

      // Apply season filter if not 'all'
      if (selectedSeasonId !== 'all') {
        const seasonId = parseInt(selectedSeasonId);
        battingQuery = battingQuery.eq('season_id', seasonId);
        bowlingQuery = bowlingQuery.eq('season_id', seasonId);
        fieldingQuery = fieldingQuery.eq('season_id', seasonId);
      }

      const [
        { data: battingData, error: battingError },
        { data: bowlingData, error: bowlingError },
        { data: fieldingData, error: fieldingError }
      ] = await Promise.all([
        battingQuery,
        bowlingQuery,
        fieldingQuery
      ]);

      if (battingError) throw battingError;
      if (bowlingError) throw bowlingError;
      if (fieldingError) throw fieldingError;

      // Aggregate batting stats
      let totalRuns = 0;
      let totalBalls = 0;
      let fours = 0;
      let sixes = 0;
      let timesOut = 0;
      let thirties = 0;
      let fifties = 0;
      let hundreds = 0;

      for (const input of battingData || []) {
        totalRuns += input.runs || 0;
        totalBalls += input.balls || 0;
        fours += input.fours || 0;
        sixes += input.sixes || 0;
        if (input.out) timesOut += 1;
        
        const runs = input.runs || 0;
        if (runs >= 100) hundreds += 1;
        else if (runs >= 50) fifties += 1;
        else if (runs >= 30) thirties += 1;
      }

      // Aggregate bowling stats
      let bowlingBalls = 0;
      let runsConceded = 0;
      let wickets = 0;
      let maidens = 0;
      let wides = 0;
      let noBalls = 0;
      let foursConceded = 0;
      let sixesConceded = 0;
      let dotBalls = 0;
      let threeFers = 0;
      let fiveFers = 0;

      for (const input of bowlingData || []) {
        bowlingBalls += input.balls || 0;
        runsConceded += input.runs_conceded || 0;
        wickets += input.wickets || 0;
        maidens += input.maidens || 0;
        wides += input.wides || 0;
        noBalls += input.no_balls || 0;
        foursConceded += input.fours_conceded || 0;
        sixesConceded += input.sixes_conceded || 0;
        dotBalls += input.dot_balls || 0;

        const wkts = input.wickets || 0;
        if (wkts >= 5) fiveFers += 1;
        else if (wkts >= 3) threeFers += 1;
      }

      // Aggregate fielding stats
      let catches = 0;
      let runouts = 0;
      let stumpings = 0;
      let droppedCatches = 0;

      for (const input of fieldingData || []) {
        catches += input.catches || 0;
        runouts += input.runouts || 0;
        stumpings += input.stumpings || 0;
        droppedCatches += input.dropped_catches || 0;
      }

      // Count unique matches
      const allMatchIds = new Set<number>();
      (battingData || []).forEach(i => allMatchIds.add(i.match_id));
      (bowlingData || []).forEach(i => allMatchIds.add(i.match_id));
      (fieldingData || []).forEach(i => allMatchIds.add(i.match_id));

      const aggregatedStats: PlayerStatsType = {
        matches: allMatchIds.size,
        total_runs: totalRuns,
        total_balls: totalBalls,
        fours,
        sixes,
        times_out: timesOut,
        thirties,
        fifties,
        hundreds,
        bowling_balls: bowlingBalls,
        runs_conceded: runsConceded,
        wickets,
        maidens,
        wides,
        no_balls: noBalls,
        fours_conceded: foursConceded,
        sixes_conceded: sixesConceded,
        dot_balls: dotBalls,
        three_fers: threeFers,
        five_fers: fiveFers,
        catches,
        runouts,
        stumpings,
        dropped_catches: droppedCatches,
      };

      setStats(aggregatedStats);

      // Set records for form analysis
      setBattingRecords(
        (battingData || []).map((r: any) => ({
          match_id: r.match_id,
          match_date: r.matches?.match_date,
          runs: r.runs,
          balls: r.balls,
        }))
      );

      setBowlingRecords(
        (bowlingData || []).map((r: any) => ({
          match_id: r.match_id,
          match_date: r.matches?.match_date,
          wickets: r.wickets,
          runs_conceded: r.runs_conceded,
          bowling_balls: r.balls,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [playerId, selectedSeasonId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    battingRecords,
    bowlingRecords,
    loading,
    error,
  };
}
