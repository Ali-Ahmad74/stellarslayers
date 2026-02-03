import { Card, CardContent } from '@/components/ui/card';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { cn } from '@/lib/utils';

interface BowlerStats {
  overs: number;
  remainingBalls: number;
  runs: number;
  wickets: number;
  maidens: number;
  wides: number;
  noBalls: number;
}

interface BowlerCardProps {
  player: {
    id: number;
    name: string;
    photo_url?: string | null;
  } | null;
  stats: BowlerStats;
  onSelect?: () => void;
  isSelectable?: boolean;
}

export function BowlerCard({ player, stats, onSelect, isSelectable = false }: BowlerCardProps) {
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
          <div className="text-muted-foreground">Select Bowler</div>
        </CardContent>
      </Card>
    );
  }

  const totalBalls = stats.overs * 6 + stats.remainingBalls;
  const economy = totalBalls > 0 ? (stats.runs / totalBalls * 6).toFixed(2) : '0.00';
  const oversDisplay = `${stats.overs}.${stats.remainingBalls}`;

  return (
    <Card 
      className={cn(
        "transition-all",
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
            <div className="font-semibold truncate">{player.name}</div>
            <div className="text-xs text-muted-foreground">Bowling</div>
          </div>
        </div>
        
        {/* Bowling figures */}
        <div className="text-center bg-background/50 rounded p-2 mb-2">
          <div className="text-lg font-bold">
            {stats.wickets}-{stats.maidens}-{stats.runs}-{stats.wickets}
          </div>
          <div className="text-xs text-muted-foreground">
            {oversDisplay} overs • Econ: {economy}
          </div>
        </div>
        
        {/* Extras */}
        {(stats.wides > 0 || stats.noBalls > 0) && (
          <div className="flex gap-3 justify-center text-xs">
            {stats.wides > 0 && (
              <span className="text-muted-foreground">Wd: {stats.wides}</span>
            )}
            {stats.noBalls > 0 && (
              <span className="text-muted-foreground">Nb: {stats.noBalls}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
