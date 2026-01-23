import { cn } from '@/lib/utils';
import { PlayerRole } from '@/types/cricket';

interface RoleBadgeProps {
  role: PlayerRole;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const getRoleStyles = () => {
    switch (role) {
      case 'Batsman':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Bowler':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'All-Rounder':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Wicket-Keeper':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        getRoleStyles()
      )}
    >
      {role}
    </span>
  );
}
