import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface LiveMatchState {
  id: string;
  match_id: number;
  is_live: boolean;
  current_innings: number;
  total_runs: number;
  wickets: number;
  overs: number;
  balls: number;
  current_striker_id: number | null;
  current_non_striker_id: number | null;
  current_bowler_id: number | null;
  target: number | null;
  match_status: string;
  created_at: string;
  updated_at: string;
}

export interface BallByBall {
  id: string;
  match_id: number;
  innings: number;
  over_number: number;
  ball_number: number;
  batsman_id: number | null;
  bowler_id: number | null;
  runs_scored: number;
  extras_type: string | null;
  extras_runs: number;
  is_wicket: boolean;
  wicket_type: string | null;
  fielder_id: number | null;
  is_boundary: boolean;
  created_at: string;
}

export function useLiveMatch(matchId: number | null) {
  const queryClient = useQueryClient();

  const { data: liveState, isLoading, error } = useQuery({
    queryKey: ['live-match-state', matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { data, error } = await supabase
        .from('live_match_state')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();
      
      if (error) throw error;
      return data as LiveMatchState | null;
    },
    enabled: !!matchId,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`live-match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_match_state',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          queryClient.setQueryData(['live-match-state', matchId], payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient]);

  // Create or update live match state
  const upsertState = useMutation({
    mutationFn: async (state: Partial<LiveMatchState> & { match_id: number }) => {
      const { data, error } = await supabase
        .from('live_match_state')
        .upsert(state, { onConflict: 'match_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-match-state', matchId] });
    },
  });

  // Update specific fields
  const updateState = useMutation({
    mutationFn: async (updates: Partial<LiveMatchState>) => {
      if (!matchId) throw new Error('No match ID');
      
      const { data, error } = await supabase
        .from('live_match_state')
        .update(updates)
        .eq('match_id', matchId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  return {
    liveState,
    isLoading,
    error,
    upsertState,
    updateState,
  };
}

export function useBallByBall(matchId: number | null, innings?: number) {
  const queryClient = useQueryClient();

  const { data: balls, isLoading, error } = useQuery({
    queryKey: ['ball-by-ball', matchId, innings],
    queryFn: async () => {
      if (!matchId) return [];
      
      let query = supabase
        .from('ball_by_ball')
        .select('*')
        .eq('match_id', matchId)
        .order('over_number', { ascending: true })
        .order('ball_number', { ascending: true });
      
      if (innings) {
        query = query.eq('innings', innings);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as BallByBall[];
    },
    enabled: !!matchId,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`ball-by-ball-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ball_by_ball',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ball-by-ball', matchId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'ball_by_ball',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ball-by-ball', matchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient, innings]);

  // Add a ball
  const addBall = useMutation({
    mutationFn: async (ball: Omit<BallByBall, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ball_by_ball')
        .insert(ball)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ball-by-ball', matchId] });
    },
  });

  // Undo last ball
  const undoLastBall = useMutation({
    mutationFn: async () => {
      if (!matchId || !balls?.length) throw new Error('No balls to undo');
      
      const lastBall = balls[balls.length - 1];
      const { error } = await supabase
        .from('ball_by_ball')
        .delete()
        .eq('id', lastBall.id);
      
      if (error) throw error;
      return lastBall;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ball-by-ball', matchId] });
    },
  });

  return {
    balls: balls || [],
    isLoading,
    error,
    addBall,
    undoLastBall,
  };
}

// Get current over balls
export function getCurrentOverBalls(balls: BallByBall[], currentOver: number, innings: number): BallByBall[] {
  return balls.filter(b => b.over_number === currentOver && b.innings === innings);
}

// Calculate batsman stats from balls
export function getBatsmanStats(balls: BallByBall[], batsmanId: number, innings: number) {
  const batsmanBalls = balls.filter(b => b.batsman_id === batsmanId && b.innings === innings);
  
  const runs = batsmanBalls.reduce((sum, b) => {
    // Don't count extras that aren't batsman runs
    if (b.extras_type === 'wide' || b.extras_type === 'noball') {
      return sum + b.runs_scored; // batsman runs only
    }
    if (b.extras_type === 'bye' || b.extras_type === 'legbye') {
      return sum; // these don't count as batsman runs
    }
    return sum + b.runs_scored;
  }, 0);
  
  // Legal deliveries faced (exclude wides)
  const ballsFaced = batsmanBalls.filter(b => b.extras_type !== 'wide').length;
  const fours = batsmanBalls.filter(b => b.runs_scored === 4 && b.is_boundary).length;
  const sixes = batsmanBalls.filter(b => b.runs_scored === 6 && b.is_boundary).length;
  const isOut = batsmanBalls.some(b => b.is_wicket);
  
  return { runs, ballsFaced, fours, sixes, isOut };
}

// Calculate bowler stats from balls
export function getBowlerStats(balls: BallByBall[], bowlerId: number, innings: number) {
  const bowlerBalls = balls.filter(b => b.bowler_id === bowlerId && b.innings === innings);
  
  // Legal deliveries (exclude wides and no-balls)
  const legalBalls = bowlerBalls.filter(b => !b.extras_type || (b.extras_type !== 'wide' && b.extras_type !== 'noball')).length;
  
  const overs = Math.floor(legalBalls / 6);
  const remainingBalls = legalBalls % 6;
  
  const runs = bowlerBalls.reduce((sum, b) => sum + b.runs_scored + b.extras_runs, 0);
  const wickets = bowlerBalls.filter(b => b.is_wicket && b.wicket_type !== 'runout').length;
  const wides = bowlerBalls.filter(b => b.extras_type === 'wide').length;
  const noBalls = bowlerBalls.filter(b => b.extras_type === 'noball').length;
  
  // Check for maidens
  const overNumbers = [...new Set(bowlerBalls.map(b => b.over_number))];
  let maidens = 0;
  for (const overNum of overNumbers) {
    const overBalls = bowlerBalls.filter(b => b.over_number === overNum);
    const overRuns = overBalls.reduce((sum, b) => sum + b.runs_scored + b.extras_runs, 0);
    if (overRuns === 0 && overBalls.length >= 6) maidens++;
  }
  
  return { overs, remainingBalls, runs, wickets, maidens, wides, noBalls };
}
