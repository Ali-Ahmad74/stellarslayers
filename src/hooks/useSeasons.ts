import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Season {
  id: number;
  name: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasons = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('seasons')
        .select('*')
        .order('year', { ascending: false });

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

    // Subscribe to realtime updates
    const channel = supabase
      .channel('seasons-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seasons' }, () => {
        fetchSeasons();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    seasons,
    loading,
    error,
    refetch: fetchSeasons,
  };
}
