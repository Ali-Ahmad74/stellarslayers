import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Season {
  id: number;
  name: string;
  year: number;
  is_active: boolean;
}

interface UsePlayerSeasonsResult {
  seasons: Season[];
  loading: boolean;
  error: string | null;
  latestSeasonId: string;
}

export function usePlayerSeasons(playerId: number | null): UsePlayerSeasonsResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestSeasonId, setLatestSeasonId] = useState<string>('all');

  const fetchSeasons = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get unique season_ids from player's batting, bowling, and fielding inputs
      const [
        { data: battingSeasons },
        { data: bowlingSeasons },
        { data: fieldingSeasons }
      ] = await Promise.all([
        supabase
          .from('batting_inputs')
          .select('season_id')
          .eq('player_id', playerId)
          .not('season_id', 'is', null),
        supabase
          .from('bowling_inputs')
          .select('season_id')
          .eq('player_id', playerId)
          .not('season_id', 'is', null),
        supabase
          .from('fielding_inputs')
          .select('season_id')
          .eq('player_id', playerId)
          .not('season_id', 'is', null),
      ]);

      // Collect unique season IDs
      const seasonIds = new Set<number>();
      (battingSeasons || []).forEach(r => r.season_id && seasonIds.add(r.season_id));
      (bowlingSeasons || []).forEach(r => r.season_id && seasonIds.add(r.season_id));
      (fieldingSeasons || []).forEach(r => r.season_id && seasonIds.add(r.season_id));

      if (seasonIds.size === 0) {
        setSeasons([]);
        setLatestSeasonId('all');
        setLoading(false);
        return;
      }

      // Fetch season details
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select('id, name, year, is_active')
        .in('id', Array.from(seasonIds))
        .order('year', { ascending: false });

      if (seasonsError) throw seasonsError;

      const playerSeasons = (seasonsData || []) as Season[];
      setSeasons(playerSeasons);

      // Set latest season (active or most recent by year)
      const activeSeason = playerSeasons.find(s => s.is_active);
      const latest = activeSeason || playerSeasons[0];
      setLatestSeasonId(latest ? String(latest.id) : 'all');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch seasons');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  return {
    seasons,
    loading,
    error,
    latestSeasonId,
  };
}
