import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Shield } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { calculateICCPoints, PlayerStats } from '@/hooks/usePlayerRankings';
import type { ScoringSettings } from '@/hooks/useScoringSettings';
import type { PlayerRole } from '@/types/cricket';

interface ShareablePlayerCardProps {
  player: {
    id: number;
    name: string;
    role: PlayerRole;
    photo_url: string | null;
    stats: PlayerStats | null;
  };
  format?: 'story' | 'square' | 'wide';
  teamName?: string;
  teamLogoUrl?: string | null;
  scoringSettings?: Partial<ScoringSettings> | null;
  watermarkEnabled?: boolean;
  watermarkHandle?: string | null;
  watermarkPosition?: string;
}

export const ShareablePlayerCard = forwardRef<HTMLDivElement, ShareablePlayerCardProps>(
  ({ 
    player, 
    format = 'story', 
    teamName = 'Stellar Slayers', 
    teamLogoUrl = null,
    scoringSettings,
    watermarkEnabled = false,
    watermarkHandle = null,
    watermarkPosition = 'bottom-right',
  }, ref) => {
    const { stats } = player;
    const iccPoints = calculateICCPoints(stats, scoringSettings);

    const strikeRate = stats && stats.total_balls > 0 
      ? ((stats.total_runs / stats.total_balls) * 100).toFixed(1) 
      : '0.0';

    const economy = stats && stats.bowling_balls > 0 
      ? (stats.runs_conceded / (stats.bowling_balls / 6)).toFixed(2) 
      : '0.00';

    const formatClasses = {
      story: 'w-[360px] h-[640px]',
      square: 'w-[400px] h-[400px]',
      wide: 'w-[600px] h-[340px]',
    };

    const layoutClasses = {
      story: 'flex-col',
      square: 'flex-col',
      wide: 'flex-row',
    };

    return (
      <div
        ref={ref}
        className={`${formatClasses[format]} relative overflow-hidden rounded-2xl`}
        style={{
          background: 'linear-gradient(135deg, hsl(222 47% 8%) 0%, hsl(222 47% 15%) 50%, hsl(187 85% 53% / 0.1) 100%)',
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-cyan blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-accent blur-3xl" />
        </div>

        {/* Decorative Lines */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />

        <div className={`relative z-10 h-full flex ${layoutClasses[format]} p-6`}>
          {/* Header Section */}
          <div className={`flex items-center ${format === 'wide' ? 'flex-col w-1/3' : 'flex-col'} gap-4`}>
            {/* Team Logo/Name */}
            <div className="text-center">
              <span className="text-cyan font-display text-sm tracking-widest uppercase">
                {teamName}
              </span>
            </div>

            {/* Player Avatar */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan to-primary blur-lg opacity-50" />
              <PlayerAvatar
                name={player.name}
                photoUrl={player.photo_url}
                size="xl"
                className="relative z-10 border-4 border-cyan/30"
              />
            </motion.div>

            {/* Player Name & Role */}
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                {player.name}
              </h2>
              <span className="text-cyan/80 text-sm font-medium uppercase tracking-wider">
                {player.role}
              </span>
            </div>

            {/* Overall Points */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30">
              <Trophy className="w-5 h-5 text-accent" />
              <span className="font-display text-2xl font-bold text-accent">
                {iccPoints.totalPoints}
              </span>
              <span className="text-accent/70 text-xs uppercase">PTS</span>
            </div>
          </div>

          {/* Stats Section */}
          <div className={`flex-1 flex flex-col justify-center ${format === 'wide' ? 'pl-6' : 'mt-6'}`}>
            {/* Stats Grid */}
            <div className={`grid ${format === 'story' ? 'grid-cols-2 gap-4' : format === 'square' ? 'grid-cols-3 gap-3' : 'grid-cols-2 gap-4'}`}>
              {/* Batting */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <div className="text-emerald-400 text-xs uppercase tracking-wider mb-1">Runs</div>
                <div className="font-display text-3xl font-bold text-white">
                  {stats?.total_runs || 0}
                </div>
                <div className="text-emerald-400/60 text-xs mt-1">
                  SR: {strikeRate}
                </div>
              </div>

              {/* Bowling */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <div className="text-red-400 text-xs uppercase tracking-wider mb-1">Wickets</div>
                <div className="font-display text-3xl font-bold text-white">
                  {stats?.wickets || 0}
                </div>
                <div className="text-red-400/60 text-xs mt-1">
                  Eco: {economy}
                </div>
              </div>

              {/* Matches */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                <div className="text-blue-400 text-xs uppercase tracking-wider mb-1">Matches</div>
                <div className="font-display text-3xl font-bold text-white">
                  {stats?.matches || 0}
                </div>
              </div>

              {/* Catches */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                <div className="text-purple-400 text-xs uppercase tracking-wider mb-1">Catches</div>
                <div className="font-display text-3xl font-bold text-white">
                  {stats?.catches || 0}
                </div>
              </div>
            </div>

            {/* Points Breakdown */}
            <div className={`mt-4 flex gap-3 ${format === 'square' ? 'justify-center' : ''}`}>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-white/60">Bat:</span>
                <span className="text-white font-semibold">{iccPoints.battingPoints}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-white/60">Bowl:</span>
                <span className="text-white font-semibold">{iccPoints.bowlingPoints}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-white/60">Field:</span>
                <span className="text-white font-semibold">{iccPoints.fieldingPoints}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`${format === 'wide' ? 'absolute bottom-4 left-6 right-6' : 'mt-4'} flex items-center justify-between text-xs text-white/40`}>
            <span>Player Stats Card</span>
            <span className="font-display tracking-wider">{teamName.toUpperCase()}</span>
          </div>
        </div>
      </div>
    );
  }
);

ShareablePlayerCard.displayName = 'ShareablePlayerCard';
