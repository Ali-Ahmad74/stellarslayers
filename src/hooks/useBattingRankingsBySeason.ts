import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RankingPlayer, PlayerRole } from '@/types/cricket';

interface BattingStats {
  player_id: number;
  total_runs: number;
  total_balls: number;
  fours: number;
  sixes: number;
  times_out: number;
  thirties: number;
  fifties: number;
  hundreds: number;
  matches: number;
}

interface Player {
  id: number;
  name: string;
  role: PlayerRole;
}

// Calculate batting points for a player's stats
function calculateBattingPoints(stats: BattingStats): number {
  let points = 0;
  
  points += stats.total_runs; // 1 point per run
  points += stats.fours * 2; // +2 per four
  points += stats.sixes * 3; // +3 per six
  
  // Milestone bonuses
  points += stats.thirties * 5; // +5 per 30+ innings
  points += stats.fifties * 10; // +10 per 50+ innings
  points += stats.hundreds * 20; // +20 per 100+ innings
  
  // Strike rate bonus: (SR - 100) / 5, capped at 30
  if (stats.total_balls > 0) {
    const strikeRate = (stats.total_runs / stats.total_balls) * 100;
    const srBonus = Math.max(0, Math.min(30, (strikeRate - 100) / 5));
    points += srBonus;
  }
  
  return Math.max(0, Math.round(points * 10) / 10);
}

export function useBattingRankingsBySeason(seasonId: string | null) {
  const [rankings, setRankings] = useState<RankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, role');

      if (playersError) throw playersError;

      // Build batting inputs query with optional season filter
      let battingQuery = supabase
        .from('batting_inputs')
        .select('player_id, runs, balls, fours, sixes, out, match_id');

      // Filter by season if selected (not 'all')
      if (seasonId && seasonId !== 'all') {
        battingQuery = battingQuery.eq('season_id', parseInt(seasonId));
      }

      const { data: battingData, error: battingError } = await battingQuery;

      if (battingError) throw battingError;

      // Aggregate batting stats per player
      const playerStatsMap = new Map<number, BattingStats>();

      for (const input of battingData || []) {
        const existing = playerStatsMap.get(input.player_id) || {
          player_id: input.player_id,
          total_runs: 0,
          total_balls: 0,
          fours: 0,
          sixes: 0,
          times_out: 0,
          thirties: 0,
          fifties: 0,
          hundreds: 0,
          matches: 0,
        };

        existing.total_runs += input.runs || 0;
        existing.total_balls += input.balls || 0;
        existing.fours += input.fours || 0;
        existing.sixes += input.sixes || 0;
        if (input.out) existing.times_out += 1;
        
        // Count milestones from individual match performances
        const runs = input.runs || 0;
        if (runs >= 100) {
          existing.hundreds += 1;
        } else if (runs >= 50) {
          existing.fifties += 1;
        } else if (runs >= 30) {
          existing.thirties += 1;
        }

        playerStatsMap.set(input.player_id, existing);
      }

      // Count unique matches per player
      const playerMatchesMap = new Map<number, Set<number>>();
      for (const input of battingData || []) {
        if (!playerMatchesMap.has(input.player_id)) {
          playerMatchesMap.set(input.player_id, new Set());
        }
        playerMatchesMap.get(input.player_id)!.add(input.match_id);
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

      const rankingsData: RankingPlayer[] = [];

      for (const [playerId, stats] of playerStatsMap) {
        const player = playersMap.get(playerId);
        if (!player) continue;

        // Only include players with batting activity
        if (stats.total_balls <= 0 && stats.total_runs <= 0) continue;

        const strikeRate = stats.total_balls > 0 ? (stats.total_runs / stats.total_balls) * 100 : 0;

        rankingsData.push({
          rank: 0,
          id: player.id,
          name: player.name,
          role: player.role,
          rating: calculateBattingPoints(stats),
          matches: stats.matches,
          runs: stats.total_runs,
          strikeRate: Math.round(strikeRate * 100) / 100,
        });
      }

      // Sort by rating (batting points) descending
      rankingsData.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if ((b.runs ?? 0) !== (a.runs ?? 0)) return (b.runs ?? 0) - (a.runs ?? 0);
        return (b.strikeRate ?? 0) - (a.strikeRate ?? 0);
      });

      // Assign ranks
      const rankedData = rankingsData.map((player, index) => ({
        ...player,
        rank: index + 1,
      }));

      setRankings(rankedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batting rankings');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchRankings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('batting-rankings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batting_inputs' }, () => {
        fetchRankings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetchRankings();
      })
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
