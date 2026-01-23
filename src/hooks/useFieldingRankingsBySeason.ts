import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RankingPlayer, PlayerRole } from '@/types/cricket';

interface FieldingStats {
  player_id: number;
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
}

// Calculate fielding points for a player's stats
function calculateFieldingPoints(stats: FieldingStats): number {
  let points = 0;
  
  points += stats.catches * 5; // +5 per catch
  points += stats.runouts * 7; // +7 per runout
  points += stats.stumpings * 7; // +7 per stumping
  points -= stats.dropped_catches * 5; // -5 per dropped catch
  
  return Math.max(0, Math.round(points * 10) / 10);
}

export function useFieldingRankingsBySeason(seasonId: string | null) {
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

      // Build fielding inputs query with optional season filter
      let fieldingQuery = supabase
        .from('fielding_inputs')
        .select('player_id, catches, runouts, stumpings, dropped_catches, match_id');

      // Filter by season if selected (not 'all')
      if (seasonId && seasonId !== 'all') {
        fieldingQuery = fieldingQuery.eq('season_id', parseInt(seasonId));
      }

      const { data: fieldingData, error: fieldingError } = await fieldingQuery;

      if (fieldingError) throw fieldingError;

      // Aggregate fielding stats per player
      const playerStatsMap = new Map<number, FieldingStats>();

      for (const input of fieldingData || []) {
        const existing = playerStatsMap.get(input.player_id) || {
          player_id: input.player_id,
          catches: 0,
          runouts: 0,
          stumpings: 0,
          dropped_catches: 0,
          matches: 0,
        };

        existing.catches += input.catches || 0;
        existing.runouts += input.runouts || 0;
        existing.stumpings += input.stumpings || 0;
        existing.dropped_catches += input.dropped_catches || 0;

        playerStatsMap.set(input.player_id, existing);
      }

      // Count unique matches per player
      const playerMatchesMap = new Map<number, Set<number>>();
      for (const input of fieldingData || []) {
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

        // Only include players with fielding activity
        if (stats.catches <= 0 && stats.runouts <= 0 && stats.stumpings <= 0) continue;

        rankingsData.push({
          rank: 0,
          id: player.id,
          name: player.name,
          role: player.role,
          rating: calculateFieldingPoints(stats),
          matches: stats.matches,
          catches: stats.catches,
          runouts: stats.runouts,
          stumpings: stats.stumpings,
        });
      }

      // Sort by rating (fielding points) descending
      rankingsData.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if ((b.catches ?? 0) !== (a.catches ?? 0)) return (b.catches ?? 0) - (a.catches ?? 0);
        return (b.runouts ?? 0) - (a.runouts ?? 0);
      });

      // Assign ranks
      const rankedData = rankingsData.map((player, index) => ({
        ...player,
        rank: index + 1,
      }));

      setRankings(rankedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fielding rankings');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchRankings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('fielding-rankings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fielding_inputs' }, () => {
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
