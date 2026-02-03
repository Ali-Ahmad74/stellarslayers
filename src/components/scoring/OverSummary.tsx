import { Badge } from '@/components/ui/badge';
import { BallByBall } from '@/hooks/useLiveMatch';
import { cn } from '@/lib/utils';

interface OverSummaryProps {
  balls: BallByBall[];
  currentOver: number;
}

export function OverSummary({ balls, currentOver }: OverSummaryProps) {
  const getBallDisplay = (ball: BallByBall) => {
    if (ball.is_wicket) {
      return { text: 'W', variant: 'destructive' as const, className: 'bg-destructive' };
    }
    if (ball.extras_type === 'wide') {
      return { text: `${ball.extras_runs}Wd`, variant: 'secondary' as const, className: 'bg-yellow-500/20 text-yellow-600' };
    }
    if (ball.extras_type === 'noball') {
      return { text: `${ball.runs_scored + ball.extras_runs}Nb`, variant: 'secondary' as const, className: 'bg-yellow-500/20 text-yellow-600' };
    }
    if (ball.extras_type === 'bye') {
      return { text: `${ball.extras_runs}B`, variant: 'secondary' as const, className: 'bg-blue-500/20 text-blue-600' };
    }
    if (ball.extras_type === 'legbye') {
      return { text: `${ball.extras_runs}Lb`, variant: 'secondary' as const, className: 'bg-blue-500/20 text-blue-600' };
    }
    if (ball.runs_scored === 4 && ball.is_boundary) {
      return { text: '4', variant: 'default' as const, className: 'bg-green-500 text-white' };
    }
    if (ball.runs_scored === 6 && ball.is_boundary) {
      return { text: '6', variant: 'default' as const, className: 'bg-purple-500 text-white' };
    }
    if (ball.runs_scored === 0) {
      return { text: '•', variant: 'outline' as const, className: '' };
    }
    return { text: String(ball.runs_scored), variant: 'outline' as const, className: '' };
  };

  // Calculate over runs
  const overRuns = balls.reduce((sum, b) => sum + b.runs_scored + b.extras_runs, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Over {currentOver + 1}</span>
        <span className="text-sm text-muted-foreground">{overRuns} runs</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {balls.map((ball, idx) => {
          const display = getBallDisplay(ball);
          return (
            <Badge
              key={ball.id || idx}
              variant={display.variant}
              className={cn(
                "w-10 h-10 flex items-center justify-center text-base font-bold rounded-full",
                display.className
              )}
            >
              {display.text}
            </Badge>
          );
        })}
        
        {/* Empty slots for remaining balls */}
        {Array.from({ length: Math.max(0, 6 - balls.filter(b => !b.extras_type || (b.extras_type !== 'wide' && b.extras_type !== 'noball')).length) }).map((_, idx) => (
          <Badge
            key={`empty-${idx}`}
            variant="outline"
            className="w-10 h-10 flex items-center justify-center text-base rounded-full border-dashed opacity-30"
          >
            -
          </Badge>
        ))}
      </div>
    </div>
  );
}
