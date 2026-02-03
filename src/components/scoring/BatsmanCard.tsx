import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { cn } from '@/lib/utils';

interface BatsmanStats {
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isOut: boolean;
}

interface BatsmanCardProps {
  player: {
    id: number;
    name: string;
    photo_url?: string | null;
  } | null;
  stats: BatsmanStats;
  isStriker: boolean;
  onSelect?: () => void;
  isSelectable?: boolean;
}

export function BatsmanCard({ player, stats, isStriker, onSelect, isSelectable = false }: BatsmanCardProps) {
  if (!player) {
    return (
      <Card 
        className={cn(
          "bg-muted/30 border-dashed cursor-pointer hover:bg-muted/50 transition-colors",
          isSelectable && "hover:border-primary"
        )}
        onClick={onSelect}
      >
        <CardContent className="p-4 text-center">
          <div className="text-muted-foreground">
            {isStriker ? 'Select Striker' : 'Select Non-Striker'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const strikeRate = stats.ballsFaced > 0 
    ? ((stats.runs / stats.ballsFaced) * 100).toFixed(1) 
    : '0.0';

  return (
    <Card 
      className={cn(
        "transition-all",
        isStriker && "ring-2 ring-primary bg-primary/5",
        isSelectable && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={isSelectable ? onSelect : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <PlayerAvatar 
            name={player.name} 
            photoUrl={player.photo_url} 
            size="sm" 
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate flex items-center gap-2">
              {player.name}
              {isStriker && <Badge variant="default" className="text-xs">*</Badge>}
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-center bg-background/50 rounded p-2">
            <div className="text-2xl font-bold">{stats.runs}{!stats.isOut && '*'}</div>
            <div className="text-xs text-muted-foreground">({stats.ballsFaced})</div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">SR</span>
              <span className="font-medium">{strikeRate}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">4s</span>
              <span className="font-medium">{stats.fours}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">6s</span>
              <span className="font-medium">{stats.sixes}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
