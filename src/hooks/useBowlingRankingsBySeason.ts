import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RankingPlayer, PlayerRole } from '@/types/cricket';
import { useScoringSettings } from '@/hooks/useScoringSettings';

interface BowlingStats {
  player_id: number;
  bowling_balls: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
  wides: number;
  no_balls: number;
  three_fers: number;
  five_fers: number;
  matches: number;
}

interface Player {
  id: number;
  name: string;
  role: PlayerRole;
  photo_url: string | null;
}

// Calculate bowling points for a player's stats
function calculateBowlingPoints(stats: BowlingStats, scoring?: ReturnType<typeof useScoringSettings>["settings"] | null): number {
  let points = 0;
  const s = scoring ?? ({} as any);
  
  points += stats.wickets * Number(s.bowling_wicket_points ?? 10);
  points += stats.maidens * Number(s.bowling_maiden_points ?? 5);
  
  // Milestone bonuses
  points += stats.three_fers * Number(s.bowling_threefer_bonus ?? 5);
  points += stats.five_fers * Number(s.bowling_fivefer_bonus ?? 10);
  
  // Penalties
  points -= stats.no_balls * Number(s.bowling_noball_penalty ?? 1);
  points -= stats.wides * Number(s.bowling_wide_penalty ?? 1);
  
  // Economy bonus: (target - economy) * multiplier, capped
  if (stats.bowling_balls > 0) {
    const overs = stats.bowling_balls / 6;
    const economy = stats.runs_conceded / overs;
    const target = Number(s.bowling_eco_target ?? 8);
    const mult = Number(s.bowling_eco_bonus_multiplier ?? 3);
    const cap = Number(s.bowling_eco_bonus_cap ?? 25);
    const ecoBonus = Math.max(0, Math.min(cap, (target - economy) * mult));
    points += ecoBonus;
  }
  
  return Math.max(0, Math.round(points * 10) / 10);
}

export function useBowlingRankingsBySeason(seasonId: string | null) {
  const [rankings, setRankings] = useState<RankingPlayer[]>([]);
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

      // Build bowling inputs query with optional season filter
      let bowlingQuery = supabase
        .from('bowling_inputs')
        .select('player_id, balls, runs_conceded, wickets, maidens, wides, no_balls, match_id');

      // Filter by season if selected (not 'all')
      if (seasonId && seasonId !== 'all') {
        bowlingQuery = bowlingQuery.eq('season_id', parseInt(seasonId));
      }

      const { data: bowlingData, error: bowlingError } = await bowlingQuery;

      if (bowlingError) throw bowlingError;

      // Aggregate bowling stats per player
      const playerStatsMap = new Map<number, BowlingStats>();

      for (const input of bowlingData || []) {
        const existing = playerStatsMap.get(input.player_id) || {
          player_id: input.player_id,
          bowling_balls: 0,
          runs_conceded: 0,
          wickets: 0,
          maidens: 0,
          wides: 0,
          no_balls: 0,
          three_fers: 0,
          five_fers: 0,
          matches: 0,
        };

        existing.bowling_balls += input.balls || 0;
        existing.runs_conceded += input.runs_conceded || 0;
        existing.wickets += input.wickets || 0;
        existing.maidens += input.maidens || 0;
        existing.wides += input.wides || 0;
        existing.no_balls += input.no_balls || 0;
        
        // Count 3-fers and 5-fers from individual match performances
        if ((input.wickets || 0) >= 5) {
          existing.five_fers += 1;
        } else if ((input.wickets || 0) >= 3) {
          existing.three_fers += 1;
        }

        playerStatsMap.set(input.player_id, existing);
      }

      // Count unique matches per player
      const playerMatchesMap = new Map<number, Set<number>>();
      for (const input of bowlingData || []) {
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

        // Only include players with bowling activity
        if (stats.bowling_balls <= 0 && stats.wickets <= 0) continue;

        const overs = stats.bowling_balls / 6;
        const economy = overs > 0 ? stats.runs_conceded / overs : 0;

        rankingsData.push({
          rank: 0,
          id: player.id,
          name: player.name,
          role: player.role,
          photo_url: player.photo_url,
          rating: calculateBowlingPoints(stats, scoringSettings),
          matches: stats.matches,
          wickets: stats.wickets,
          economy: Math.round(economy * 100) / 100,
        });
      }

      // Sort by rating (bowling points) descending
      rankingsData.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if ((b.wickets ?? 0) !== (a.wickets ?? 0)) return (b.wickets ?? 0) - (a.wickets ?? 0);
        return (a.economy ?? 0) - (b.economy ?? 0);
      });

      // Assign ranks
      const rankedData = rankingsData.map((player, index) => ({
        ...player,
        rank: index + 1,
      }));

      setRankings(rankedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bowling rankings');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchRankings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('bowling-rankings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bowling_inputs' }, () => {
        fetchRankings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetchRankings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scoring_settings' }, () => {
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
