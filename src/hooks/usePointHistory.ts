import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateICCPoints, PlayerStats } from './usePlayerRankings';
import { logger } from '@/lib/logger';

export interface PointHistory {
  player_id: number;
  record_date: string;
  batting_points: number;
  bowling_points: number;
  fielding_points: number;
  total_points: number;
}

export interface PlayerPointChanges {
  playerId: number;
  currentPoints: number;
  weeklyChange: number;
  monthlyChange: number;
}

export function usePointHistory() {
  const [pointChanges, setPointChanges] = useState<Map<number, PlayerPointChanges>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchPointHistory = async () => {
    setLoading(true);
    
    try {
      // Fetch all point history
      const { data: historyData, error: historyError } = await supabase
        .from('point_history')
        .select('*')
        .order('record_date', { ascending: false });

      if (historyError) throw historyError;

      // Calculate changes for each player
      const changes = new Map<number, PlayerPointChanges>();
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Group by player
      const playerHistories = new Map<number, PointHistory[]>();
      (historyData || []).forEach((record) => {
        const existing = playerHistories.get(record.player_id) || [];
        existing.push(record as PointHistory);
        playerHistories.set(record.player_id, existing);
      });

      playerHistories.forEach((history, playerId) => {
        // Sort by date descending
        history.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
        
        const current = history[0]?.total_points || 0;
        
        // Find points from a week ago
        const weekRecord = history.find(h => new Date(h.record_date) <= weekAgo);
        const weeklyChange = weekRecord ? current - weekRecord.total_points : 0;
        
        // Find points from a month ago
        const monthRecord = history.find(h => new Date(h.record_date) <= monthAgo);
        const monthlyChange = monthRecord ? current - monthRecord.total_points : 0;

        changes.set(playerId, {
          playerId,
          currentPoints: current,
          weeklyChange,
          monthlyChange,
        });
      });

      setPointChanges(changes);
    } catch (err) {
      logger.error('Error fetching point history:', err);
    } finally {
      setLoading(false);
    }
  };

  const recordCurrentPoints = async () => {
    try {
      // Fetch current player stats
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id');

      if (playersError) throw playersError;

      const { data: statsData, error: statsError } = await supabase
        .from('player_stats')
        .select('*');

      if (statsError) throw statsError;

      const today = new Date().toISOString().split('T')[0];

      // Calculate and upsert points for each player
      for (const player of playersData || []) {
        const playerStats = statsData?.find(s => s.player_id === player.id);
        
        if (playerStats) {
          const stats: PlayerStats = {
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
          };

          const points = calculateICCPoints(stats);

          await supabase
            .from('point_history')
            .upsert({
              player_id: player.id,
              record_date: today,
              batting_points: Math.round(points.battingPoints),
              bowling_points: Math.round(points.bowlingPoints),
              fielding_points: Math.round(points.fieldingPoints),
              total_points: Math.round(points.totalPoints),
            }, {
              onConflict: 'player_id,record_date',
            });
        }
      }

      // Refresh the history
      await fetchPointHistory();
    } catch (err) {
      logger.error('Error recording points:', err);
    }
  };

  useEffect(() => {
    fetchPointHistory();
  }, []);

  return {
    pointChanges,
    loading,
    recordCurrentPoints,
    refetch: fetchPointHistory,
  };
}
