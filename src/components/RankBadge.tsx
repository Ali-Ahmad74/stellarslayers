import { cn } from '@/lib/utils';

interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg',
  };

  const getStyles = () => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-amber-950 shadow-lg shadow-amber-400/30 animate-pulse-glow';
      case 2:
        return 'bg-gradient-to-br from-slate-300 via-gray-200 to-slate-400 text-slate-800 shadow-md';
      case 3:
        return 'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 text-white shadow-md';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold font-display',
        sizeClasses[size],
        getStyles()
      )}
    >
      {rank}
    </div>
  );
}
