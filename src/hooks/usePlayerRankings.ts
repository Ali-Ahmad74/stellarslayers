import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RankingPlayer, PlayerRole } from '@/types/cricket';
import type { ScoringSettings } from '@/hooks/useScoringSettings';

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
export function calculateICCPoints(stats: PlayerStats | null, scoring?: Partial<ScoringSettings> | null): ICCPoints {
  if (!stats) {
    return { battingPoints: 0, bowlingPoints: 0, fieldingPoints: 0, totalPoints: 0 };
  }

  const s = scoring ?? {};

  // === BATTING POINTS ===
  let battingPoints = 0;
  if (stats.total_runs > 0 || stats.total_balls > 0) {
    // Base points
    battingPoints += stats.total_runs * (Number(s.batting_run_points ?? 1));
    battingPoints += stats.fours * (Number(s.batting_four_points ?? 2));
    battingPoints += stats.sixes * (Number(s.batting_six_points ?? 3));
    
    // Milestone bonuses (aggregate counts)
    battingPoints += stats.thirties * (Number(s.batting_thirty_bonus ?? 5));
    battingPoints += stats.fifties * (Number(s.batting_fifty_bonus ?? 10));
    battingPoints += stats.hundreds * (Number(s.batting_hundred_bonus ?? 20));
    
    // Strike rate bonus: (SR - 100) / 5, capped at 30
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
    bowlingPoints += stats.wickets * (Number(s.bowling_wicket_points ?? 10));
    bowlingPoints += stats.maidens * (Number(s.bowling_maiden_points ?? 5));
    
    // Milestone bonuses
    bowlingPoints += stats.three_fers * (Number(s.bowling_threefer_bonus ?? 5));
    bowlingPoints += stats.five_fers * (Number(s.bowling_fivefer_bonus ?? 10));
    
    // Penalties
    bowlingPoints -= stats.no_balls * (Number(s.bowling_noball_penalty ?? 1));
    bowlingPoints -= stats.wides * (Number(s.bowling_wide_penalty ?? 1));
    
    // Economy bonus: (8 - economy) * 3, capped at 25
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
  fieldingPoints += stats.catches * (Number(s.fielding_catch_points ?? 5));
  fieldingPoints += stats.runouts * (Number(s.fielding_runout_points ?? 7));
  fieldingPoints += stats.stumpings * (Number(s.fielding_stumping_points ?? 7));
  fieldingPoints -= stats.dropped_catches * (Number(s.fielding_dropped_catch_penalty ?? 5));

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

export function usePlayerRankings(seriesId?: number | null) {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scoring, setScoring] = useState<ScoringSettings | null>(null);

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

      let statsData: any[] = [];

      if (seriesId) {
        const { data: matchRows, error: matchErr } = await supabase
          .from('matches')
          .select('id')
          .eq('series_id', seriesId);
        if (matchErr) throw matchErr;

        const matchIds = (matchRows ?? []).map((m: any) => m.id).filter((x) => Number.isFinite(Number(x)));

        if (matchIds.length === 0) {
          statsData = [];
        } else {
          const [batRes, bowlRes, fieldRes] = await Promise.all([
            supabase
              .from('batting_inputs')
              .select('player_id, runs, balls, fours, sixes, out, match_id')
              .in('match_id', matchIds),
            supabase
              .from('bowling_inputs')
              .select('player_id, balls, runs_conceded, wickets, maidens, wides, no_balls, fours_conceded, sixes_conceded, match_id')
              .in('match_id', matchIds),
            supabase
              .from('fielding_inputs')
              .select('player_id, catches, runouts, stumpings, dropped_catches, match_id')
              .in('match_id', matchIds),
          ]);

          if (batRes.error) throw batRes.error;
          if (bowlRes.error) throw bowlRes.error;
          if (fieldRes.error) throw fieldRes.error;

          type Mutable = {
            player_id: number;
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
          };

          const byPlayer = new Map<number, Mutable>();
          const byPlayerMatches = new Map<number, Set<number>>();

          const ensure = (pid: number): Mutable => {
            const existing = byPlayer.get(pid);
            if (existing) return existing;
            const init: Mutable = {
              player_id: pid,
              matches: 0,
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
              fours_conceded: 0,
              sixes_conceded: 0,
              three_fers: 0,
              five_fers: 0,
              catches: 0,
              runouts: 0,
              stumpings: 0,
              dropped_catches: 0,
            };
            byPlayer.set(pid, init);
            return init;
          };

          const addMatch = (pid: number, mid: number) => {
            if (!byPlayerMatches.has(pid)) byPlayerMatches.set(pid, new Set());
            byPlayerMatches.get(pid)!.add(mid);
          };

          for (const row of (batRes.data as any[]) ?? []) {
            const pid = Number(row.player_id);
            const mid = Number(row.match_id);
            if (!Number.isFinite(pid)) continue;
            const s = ensure(pid);
            s.total_runs += Number(row.runs ?? 0);
            s.total_balls += Number(row.balls ?? 0);
            s.fours += Number(row.fours ?? 0);
            s.sixes += Number(row.sixes ?? 0);
            if (row.out) s.times_out += 1;

            const runs = Number(row.runs ?? 0);
            if (runs >= 100) s.hundreds += 1;
            else if (runs >= 50) s.fifties += 1;
            else if (runs >= 30) s.thirties += 1;

            if (Number.isFinite(mid)) addMatch(pid, mid);
          }

          for (const row of (bowlRes.data as any[]) ?? []) {
            const pid = Number(row.player_id);
            const mid = Number(row.match_id);
            if (!Number.isFinite(pid)) continue;
            const s = ensure(pid);
            s.bowling_balls += Number(row.balls ?? 0);
            s.runs_conceded += Number(row.runs_conceded ?? 0);
            s.wickets += Number(row.wickets ?? 0);
            s.maidens += Number(row.maidens ?? 0);
            s.wides += Number(row.wides ?? 0);
            s.no_balls += Number(row.no_balls ?? 0);
            s.fours_conceded += Number(row.fours_conceded ?? 0);
            s.sixes_conceded += Number(row.sixes_conceded ?? 0);

            const wk = Number(row.wickets ?? 0);
            if (wk >= 5) s.five_fers += 1;
            else if (wk >= 3) s.three_fers += 1;

            if (Number.isFinite(mid)) addMatch(pid, mid);
          }

          for (const row of (fieldRes.data as any[]) ?? []) {
            const pid = Number(row.player_id);
            const mid = Number(row.match_id);
            if (!Number.isFinite(pid)) continue;
            const s = ensure(pid);
            s.catches += Number(row.catches ?? 0);
            s.runouts += Number(row.runouts ?? 0);
            s.stumpings += Number(row.stumpings ?? 0);
            s.dropped_catches += Number(row.dropped_catches ?? 0);
            if (Number.isFinite(mid)) addMatch(pid, mid);
          }

          statsData = [...byPlayer.values()].map((s) => ({
            ...s,
            matches: byPlayerMatches.get(s.player_id)?.size ?? 0,
          }));
        }
      } else {
        // Fetch stats from the view
        const { data: viewData, error: statsError } = await supabase
          .from('player_stats')
          .select('*');

        if (statsError) throw statsError;
        statsData = (viewData as any[]) ?? [];
      }

      // Fetch scoring settings (single-row)
      const { data: scoringData, error: scoringError } = await supabase
        .from('scoring_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (scoringError) throw scoringError;
      setScoring(scoringData as any);

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

        const iccPoints = calculateICCPoints(stats, scoringData as any);

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
      .channel(seriesId ? `players-realtime-series-${seriesId}` : 'players-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetchPlayers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scoring_settings' }, () => {
        fetchPlayers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, [seriesId]);

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
