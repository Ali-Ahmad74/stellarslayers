import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RankingPlayer, PlayerRole } from '@/types/cricket';

export interface PlayerStats {
  matches: number;
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
  fours_conceded: number;
  sixes_conceded: number;
  three_fers: number;
  five_fers: number;
  catches: number;
  runouts: number;
  stumpings: number;
  dropped_catches: number;
}

export interface ICCPoints {
  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  totalPoints: number;
}

export interface PlayerWithStats {
  id: number;
  name: string;
  role: PlayerRole;
  batting_style: string | null;
  bowling_style: string | null;
  photo_url: string | null;
  stats: PlayerStats | null;
  iccPoints: ICCPoints;
}

// ICC-style points calculation with milestones and bonuses
export function calculateICCPoints(stats: PlayerStats | null): ICCPoints {
  if (!stats) {
    return { battingPoints: 0, bowlingPoints: 0, fieldingPoints: 0, totalPoints: 0 };
  }

  // === BATTING POINTS ===
  let battingPoints = 0;
  if (stats.total_runs > 0 || stats.total_balls > 0) {
    // Base points
    battingPoints += stats.total_runs; // 1 point per run
    battingPoints += stats.fours * 2; // +2 per four
    battingPoints += stats.sixes * 3; // +3 per six
    
    // Milestone bonuses (aggregate counts)
    battingPoints += stats.thirties * 5; // +5 per 30+ innings
    battingPoints += stats.fifties * 10; // +10 per 50+ innings
    battingPoints += stats.hundreds * 20; // +20 per 100+ innings
    
    // Strike rate bonus: (SR - 100) / 5, capped at 30
    if (stats.total_balls > 0) {
      const strikeRate = (stats.total_runs / stats.total_balls) * 100;
      const srBonus = Math.max(0, Math.min(30, (strikeRate - 100) / 5));
      battingPoints += srBonus;
    }
  }

  // === BOWLING POINTS ===
  let bowlingPoints = 0;
  if (stats.wickets > 0 || stats.bowling_balls > 0) {
    bowlingPoints += stats.wickets * 10; // +10 per wicket
    bowlingPoints += stats.maidens * 5; // +5 per maiden
    
    // Milestone bonuses
    bowlingPoints += stats.three_fers * 5; // +5 per 3fer
    bowlingPoints += stats.five_fers * 10; // +10 per 5fer
    
    // Penalties
    bowlingPoints -= stats.no_balls * 1; // -1 per no-ball
    bowlingPoints -= stats.wides * 1; // -1 per wide
    
    // Economy bonus: (8 - economy) * 3, capped at 25
    if (stats.bowling_balls > 0) {
      const overs = stats.bowling_balls / 6;
      const economy = stats.runs_conceded / overs;
      const ecoBonus = Math.max(0, Math.min(25, (8 - economy) * 3));
      bowlingPoints += ecoBonus;
    }
  }

  // === FIELDING POINTS ===
  let fieldingPoints = 0;
  fieldingPoints += stats.catches * 5; // +5 per catch
  fieldingPoints += stats.runouts * 7; // +7 per runout
  fieldingPoints += stats.stumpings * 7; // +7 per stumping
  fieldingPoints -= stats.dropped_catches * 5; // -5 per dropped catch

  // Ensure non-negative
  battingPoints = Math.max(0, battingPoints);
  bowlingPoints = Math.max(0, bowlingPoints);
  fieldingPoints = Math.max(0, fieldingPoints);

  const totalPoints = Math.round((battingPoints + bowlingPoints + fieldingPoints) * 10) / 10;

  return {
    battingPoints: Math.round(battingPoints * 10) / 10,
    bowlingPoints: Math.round(bowlingPoints * 10) / 10,
    fieldingPoints: Math.round(fieldingPoints * 10) / 10,
    totalPoints,
  };
}

export function usePlayerRankings() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (playersError) throw playersError;

      // Fetch stats from the view
      const { data: statsData, error: statsError } = await supabase
        .from('player_stats')
        .select('*');

      if (statsError) throw statsError;

      // Combine players with their stats and calculate ICC points
      const playersWithStats: PlayerWithStats[] = (playersData || []).map((player) => {
        const playerStats = statsData?.find(s => s.player_id === player.id);
        
        const stats: PlayerStats | null = playerStats ? {
          matches: Number(playerStats.matches) || 0,
          total_runs: Number(playerStats.total_runs) || 0,
          total_balls: Number(playerStats.total_balls) || 0,
          fours: Number(playerStats.fours) || 0,
          sixes: Number(playerStats.sixes) || 0,
          times_out: Number(playerStats.times_out) || 0,
          thirties: Number((playerStats as any).thirties) || 0,
          fifties: Number((playerStats as any).fifties) || 0,
          hundreds: Number((playerStats as any).hundreds) || 0,
          bowling_balls: Number(playerStats.bowling_balls) || 0,
          runs_conceded: Number(playerStats.runs_conceded) || 0,
          wickets: Number(playerStats.wickets) || 0,
          maidens: Number(playerStats.maidens) || 0,
          wides: Number(playerStats.wides) || 0,
          no_balls: Number(playerStats.no_balls) || 0,
          fours_conceded: Number((playerStats as any).fours_conceded) || 0,
          sixes_conceded: Number((playerStats as any).sixes_conceded) || 0,
          three_fers: Number((playerStats as any).three_fers) || 0,
          five_fers: Number((playerStats as any).five_fers) || 0,
          catches: Number(playerStats.catches) || 0,
          runouts: Number(playerStats.runouts) || 0,
          stumpings: Number(playerStats.stumpings) || 0,
          dropped_catches: Number((playerStats as any).dropped_catches) || 0,
        } : null;

        const iccPoints = calculateICCPoints(stats);

        return {
          id: player.id,
          name: player.name,
          role: player.role as PlayerRole,
          batting_style: player.batting_style,
          bowling_style: player.bowling_style,
          photo_url: player.photo_url,
          stats,
          iccPoints,
        };
      });

      setPlayers(playersWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();

    // Subscribe to realtime updates
    const playersChannel = supabase
      .channel('players-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetchPlayers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batting_inputs' }, () => {
        fetchPlayers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bowling_inputs' }, () => {
        fetchPlayers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fielding_inputs' }, () => {
        fetchPlayers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, []);

  const getBattingRankings = (minMatches: number = 0): RankingPlayer[] => {
    return players
      .filter((player) => {
        if (!player.stats) return false;
        if (player.stats.total_balls <= 0 && player.stats.total_runs <= 0) return false;
        if ((player.stats.matches || 0) < minMatches) return false;
        return true;
      })
      .map((player) => {
        const stats = player.stats!;
        const strikeRate = stats.total_balls > 0 ? (stats.total_runs / stats.total_balls) * 100 : 0;

        return {
          rank: 0,
          id: player.id,
          name: player.name,
          role: player.role,
          rating: player.iccPoints.battingPoints,
          matches: stats.matches,
          runs: stats.total_runs,
          strikeRate: Math.round(strikeRate * 100) / 100,
        };
      })
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if ((b.runs ?? 0) !== (a.runs ?? 0)) return (b.runs ?? 0) - (a.runs ?? 0);
        return (b.strikeRate ?? 0) - (a.strikeRate ?? 0);
      })
      .map((player, index) => ({ ...player, rank: index + 1 }));
  };

  const getBowlingRankings = (minMatches: number = 0, minOvers: number = 0): RankingPlayer[] => {
    const minBalls = minOvers * 6;
    return players
      .filter((player) => {
        if (!player.stats) return false;
        if (player.stats.bowling_balls <= 0 && player.stats.wickets <= 0) return false;
        if ((player.stats.matches || 0) < minMatches) return false;
        if (player.stats.bowling_balls < minBalls) return false;
        return true;
      })
      .map((player) => {
        const stats = player.stats!;
        const overs = stats.bowling_balls / 6;
        const economy = overs > 0 ? stats.runs_conceded / overs : 0;

        return {
          rank: 0,
          id: player.id,
          name: player.name,
          role: player.role,
          rating: player.iccPoints.bowlingPoints,
          matches: stats.matches,
          wickets: stats.wickets,
          economy: Math.round(economy * 100) / 100,
        };
      })
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if ((b.wickets ?? 0) !== (a.wickets ?? 0)) return (b.wickets ?? 0) - (a.wickets ?? 0);
        return (a.economy ?? 0) - (b.economy ?? 0);
      })
      .map((player, index) => ({ ...player, rank: index + 1 }));
  };

  const getFieldingRankings = (minMatches: number = 0): RankingPlayer[] => {
    return players
      .filter((player) => {
        if (!player.stats) return false;
        const hasFielding = player.stats.catches > 0 || player.stats.runouts > 0 || player.stats.stumpings > 0;
        if (!hasFielding) return false;
        if ((player.stats.matches || 0) < minMatches) return false;
        return true;
      })
      .map((player) => {
        const stats = player.stats!;
        return {
          rank: 0,
          id: player.id,
          name: player.name,
          role: player.role,
          rating: player.iccPoints.fieldingPoints,
          matches: stats.matches,
          catches: stats.catches,
          runouts: stats.runouts,
          stumpings: stats.stumpings,
        };
      })
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if ((b.catches ?? 0) !== (a.catches ?? 0)) return (b.catches ?? 0) - (a.catches ?? 0);
        return (b.runouts ?? 0) - (a.runouts ?? 0);
      })
      .map((player, index) => ({ ...player, rank: index + 1 }));
  };

  const getOverallRankings = (minMatches: number = 0): RankingPlayer[] => {
    return players
      .filter((player) => {
        if (!player.stats) return false;
        const hasAnyStats = 
          player.stats.total_balls > 0 || player.stats.total_runs > 0 ||
          player.stats.bowling_balls > 0 || player.stats.wickets > 0 ||
          player.stats.catches > 0 || player.stats.runouts > 0 || player.stats.stumpings > 0;
        if (!hasAnyStats) return false;
        if ((player.stats.matches || 0) < minMatches) return false;
        return true;
      })
      .map((player) => {
        const stats = player.stats!;
        return {
          rank: 0,
          id: player.id,
          name: player.name,
          role: player.role,
          rating: player.iccPoints.totalPoints,
          matches: stats.matches,
          runs: stats.total_runs,
          wickets: stats.wickets,
          catches: stats.catches,
        };
      })
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if ((b.matches ?? 0) !== (a.matches ?? 0)) return (b.matches ?? 0) - (a.matches ?? 0);
        return (b.runs ?? 0) - (a.runs ?? 0);
      })
      .map((player, index) => ({ ...player, rank: index + 1 }));
  };

  return {
    players,
    loading,
    error,
    refetch: fetchPlayers,
    getBattingRankings,
    getBowlingRankings,
    getFieldingRankings,
    getOverallRankings,
  };
}
