import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Season {
  id: number;
  name: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export function useSeasons() {
  const { team } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasons = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('seasons')
        .select('*')
        .order('year', { ascending: false });

      // Filter by team if available
      if (team?.id) {
        query = query.eq('team_id', team.id);
      } else {
        // No team yet — return empty
        setSeasons([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setSeasons(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch seasons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();

    const channel = supabase
      .channel('seasons-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seasons' }, () => {
        fetchSeasons();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team?.id]);

  const activeSeason = seasons.find(s => s.is_active);
  const activeSeasonId = activeSeason ? String(activeSeason.id) : null;

  return {
    seasons,
    loading,
    error,
    refetch: fetchSeasons,
    activeSeason,
    activeSeasonId,
  };
}
