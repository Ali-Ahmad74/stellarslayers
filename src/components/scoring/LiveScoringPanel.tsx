import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WicketDialog } from './WicketDialog';
import { Undo2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player {
  id: number;
  name: string;
  photo_url?: string | null;
}

interface LiveScoringPanelProps {
  striker: Player | null;
  nonStriker: Player | null;
  bowler: Player | null;
  allPlayers: Player[];
  onScoreBall: (runs: number, extras?: { type: string; runs: number }, isWicket?: boolean, wicketDetails?: { type: string; fielderId: number | null }) => void;
  onUndo: () => void;
  onRotateStrike: () => void;
  disabled?: boolean;
}

export function LiveScoringPanel({
  striker,
  nonStriker,
  bowler,
  allPlayers,
  onScoreBall,
  onUndo,
  onRotateStrike,
  disabled = false,
}: LiveScoringPanelProps) {
  const [wicketDialogOpen, setWicketDialogOpen] = useState(false);
  const [pendingExtras, setPendingExtras] = useState<{ type: string; runs: number } | null>(null);

  const handleRunClick = (runs: number, isBoundary = false) => {
    if (disabled || !striker || !bowler) return;
    onScoreBall(runs, undefined, false, undefined);
  };

  const handleExtrasClick = (type: 'wide' | 'noball' | 'bye' | 'legbye') => {
    if (disabled || !bowler) return;
    
    // For wides and no-balls, default to 1 extra run
    if (type === 'wide' || type === 'noball') {
      onScoreBall(0, { type, runs: 1 }, false, undefined);
    } else {
      // For byes and leg-byes, could add a dialog for runs, but default to 1
      onScoreBall(0, { type, runs: 1 }, false, undefined);
    }
  };

  const handleWicketClick = () => {
    if (disabled || !striker || !bowler) return;
    setWicketDialogOpen(true);
  };

  const handleWicketConfirm = (wicketType: string, fielderId: number | null, runsOnWicket: number) => {
    onScoreBall(runsOnWicket, undefined, true, { type: wicketType, fielderId });
  };

  const runButtons = [
    { runs: 0, label: '0', className: 'bg-muted hover:bg-muted/80' },
    { runs: 1, label: '1', className: '' },
    { runs: 2, label: '2', className: '' },
    { runs: 3, label: '3', className: '' },
    { runs: 4, label: '4', className: 'bg-green-500 hover:bg-green-600 text-white' },
    { runs: 6, label: '6', className: 'bg-purple-500 hover:bg-purple-600 text-white' },
  ];

  const extrasButtons = [
    { type: 'wide' as const, label: 'Wide', className: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 dark:text-yellow-400' },
    { type: 'noball' as const, label: 'No Ball', className: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 dark:text-yellow-400' },
    { type: 'bye' as const, label: 'Bye', className: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400' },
    { type: 'legbye' as const, label: 'Leg Bye', className: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400' },
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Score Ball</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Run buttons */}
          <div className="grid grid-cols-6 gap-2">
            {runButtons.map(({ runs, label, className }) => (
              <Button
                key={runs}
                variant="outline"
                className={cn(
                  "h-14 text-xl font-bold",
                  className
                )}
                onClick={() => handleRunClick(runs, runs >= 4)}
                disabled={disabled || !striker || !bowler}
              >
                {label}
              </Button>
            ))}
          </div>
          
          {/* Extras buttons */}
          <div className="grid grid-cols-4 gap-2">
            {extrasButtons.map(({ type, label, className }) => (
              <Button
                key={type}
                variant="outline"
                className={cn("h-12", className)}
                onClick={() => handleExtrasClick(type)}
                disabled={disabled || !bowler}
              >
                {label}
              </Button>
            ))}
          </div>
          
          {/* Wicket button */}
          <Button
            variant="destructive"
            className="w-full h-14 text-xl font-bold"
            onClick={handleWicketClick}
            disabled={disabled || !striker || !bowler}
          >
            🎯 WICKET
          </Button>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onUndo}
              disabled={disabled}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Undo Last
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onRotateStrike}
              disabled={disabled || !striker || !nonStriker}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rotate Strike
            </Button>
          </div>
        </CardContent>
      </Card>

      <WicketDialog
        open={wicketDialogOpen}
        onOpenChange={setWicketDialogOpen}
        batsman={striker}
        bowler={bowler}
        players={allPlayers}
        onConfirm={handleWicketConfirm}
      />
    </>
  );
}
