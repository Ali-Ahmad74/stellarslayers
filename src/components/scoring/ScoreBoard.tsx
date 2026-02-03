import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LiveMatchState } from '@/hooks/useLiveMatch';

interface ScoreBoardProps {
  liveState: LiveMatchState | null;
  matchInfo?: {
    opponent_name?: string | null;
    venue?: string | null;
    overs?: number;
  };
  teamName?: string;
}

export function ScoreBoard({ liveState, matchInfo, teamName = 'Stellar Slayers' }: ScoreBoardProps) {
  const totalRuns = liveState?.total_runs || 0;
  const wickets = liveState?.wickets || 0;
  const overs = liveState?.overs || 0;
  const balls = liveState?.balls || 0;
  const target = liveState?.target;
  const innings = liveState?.current_innings || 1;
  
  // Calculate run rate
  const totalBalls = overs * 6 + balls;
  const runRate = totalBalls > 0 ? (totalRuns / totalBalls * 6).toFixed(2) : '0.00';
  
  // Calculate required run rate for 2nd innings
  const matchOvers = matchInfo?.overs || 20;
  const remainingBalls = matchOvers * 6 - totalBalls;
  const requiredRuns = target ? target - totalRuns : 0;
  const requiredRunRate = remainingBalls > 0 && target ? (requiredRuns / remainingBalls * 6).toFixed(2) : null;
  
  const getStatusBadge = () => {
    switch (liveState?.match_status) {
      case 'live':
        return <Badge variant="destructive" className="animate-pulse">🔴 LIVE</Badge>;
      case 'innings_break':
        return <Badge variant="secondary">Innings Break</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold">
              {teamName} vs {matchInfo?.opponent_name || 'Opponent'}
            </h2>
            {matchInfo?.venue && (
              <p className="text-sm text-muted-foreground">{matchInfo.venue}</p>
            )}
          </div>
          {getStatusBadge()}
        </div>
        
        {/* Innings indicator */}
        <div className="mb-3">
          <Badge variant="outline" className="text-xs">
            {innings === 1 ? '1st Innings' : '2nd Innings'}
          </Badge>
        </div>
        
        {/* Main Score */}
        <div className="text-center py-4 md:py-6 bg-background/50 rounded-lg mb-4">
          <div className="text-5xl md:text-7xl font-bold tracking-tight">
            {totalRuns}/{wickets}
          </div>
          <div className="text-xl md:text-2xl text-muted-foreground mt-2">
            ({overs}.{balls} overs)
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-background/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground uppercase">Run Rate</div>
            <div className="text-lg font-bold">{runRate}</div>
          </div>
          
          {target && innings === 2 && (
            <>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground uppercase">Target</div>
                <div className="text-lg font-bold">{target}</div>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground uppercase">Need</div>
                <div className="text-lg font-bold">{requiredRuns} off {remainingBalls}</div>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground uppercase">Req. RR</div>
                <div className="text-lg font-bold">{requiredRunRate || '-'}</div>
              </div>
            </>
          )}
          
          {(!target || innings === 1) && (
            <div className="bg-background/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase">Overs Left</div>
              <div className="text-lg font-bold">{(matchOvers - overs - (balls > 0 ? 1 : 0)).toFixed(0)}.{balls > 0 ? 6 - balls : 0}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
