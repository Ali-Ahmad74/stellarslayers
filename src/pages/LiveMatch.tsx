import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLiveMatch, useBallByBall, getCurrentOverBalls, getBatsmanStats, getBowlerStats } from '@/hooks/useLiveMatch';
import { useTeamSettings } from '@/hooks/useTeamSettings';
import { Header } from '@/components/Header';
import { ScoreBoard } from '@/components/scoring/ScoreBoard';
import { BatsmanCard } from '@/components/scoring/BatsmanCard';
import { BowlerCard } from '@/components/scoring/BowlerCard';
import { OverSummary } from '@/components/scoring/OverSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Radio } from 'lucide-react';

export default function LiveMatch() {
  const { id } = useParams<{ id: string }>();
  const matchId = id ? parseInt(id) : null;
  const { teamSettings } = useTeamSettings();
  
  // Fetch match details
  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });
  
  // Fetch all players
  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, photo_url, role')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
  
  const { liveState } = useLiveMatch(matchId);
  const { balls } = useBallByBall(matchId, liveState?.current_innings);
  
  // Get current players
  const striker = players.find(p => p.id === liveState?.current_striker_id) || null;
  const nonStriker = players.find(p => p.id === liveState?.current_non_striker_id) || null;
  const bowler = players.find(p => p.id === liveState?.current_bowler_id) || null;
  
  // Get current over balls
  const currentOverBalls = useMemo(() => {
    if (!liveState) return [];
    return getCurrentOverBalls(balls, liveState.overs, liveState.current_innings);
  }, [balls, liveState?.overs, liveState?.current_innings]);
  
  // Get batsman stats
  const strikerStats = useMemo(() => {
    if (!striker || !liveState) return { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false };
    return getBatsmanStats(balls, striker.id, liveState.current_innings);
  }, [balls, striker?.id, liveState?.current_innings]);
  
  const nonStrikerStats = useMemo(() => {
    if (!nonStriker || !liveState) return { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false };
    return getBatsmanStats(balls, nonStriker.id, liveState.current_innings);
  }, [balls, nonStriker?.id, liveState?.current_innings]);
  
  // Get bowler stats
  const bowlerStats = useMemo(() => {
    if (!bowler || !liveState) return { overs: 0, remainingBalls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 };
    return getBowlerStats(balls, bowler.id, liveState.current_innings);
  }, [balls, bowler?.id, liveState?.current_innings]);
  
  // Recent balls for commentary
  const recentBalls = useMemo(() => {
    return [...balls].reverse().slice(0, 12);
  }, [balls]);
  
  const getBallCommentary = (ball: typeof balls[0]) => {
    const batsman = players.find(p => p.id === ball.batsman_id);
    const bowlerPlayer = players.find(p => p.id === ball.bowler_id);
    const fielder = ball.fielder_id ? players.find(p => p.id === ball.fielder_id) : null;
    
    let text = `${ball.over_number}.${ball.ball_number + 1} `;
    text += `${bowlerPlayer?.name || 'Unknown'} to ${batsman?.name || 'Unknown'}, `;
    
    if (ball.is_wicket) {
      text += `OUT! ${ball.wicket_type?.toUpperCase()}`;
      if (fielder) text += ` by ${fielder.name}`;
    } else if (ball.extras_type === 'wide') {
      text += `Wide (${ball.extras_runs} runs)`;
    } else if (ball.extras_type === 'noball') {
      text += `No ball, ${ball.runs_scored} runs`;
    } else if (ball.is_boundary && ball.runs_scored === 6) {
      text += `SIX! 🎆`;
    } else if (ball.is_boundary && ball.runs_scored === 4) {
      text += `FOUR! 🏏`;
    } else if (ball.runs_scored === 0) {
      text += `Dot ball`;
    } else {
      text += `${ball.runs_scored} run${ball.runs_scored > 1 ? 's' : ''}`;
    }
    
    return text;
  };

  if (matchLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center">Loading...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center">Match not found</div>
      </div>
    );
  }

  // Match not live
  if (!liveState || liveState.match_status === 'not_started') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Card className="text-center py-12">
            <CardContent>
              <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Match Not Started</h2>
              <p className="text-muted-foreground mb-4">
                {teamSettings?.team_name || 'Stellar Slayers'} vs {match.opponent_name || 'Opponent'}
              </p>
              <p className="text-sm text-muted-foreground">
                Live scoring hasn't started yet. Check back soon!
              </p>
              <Button asChild className="mt-6">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-4 md:py-6 space-y-4">
        {/* Live indicator */}
        {liveState.match_status === 'live' && (
          <div className="flex items-center gap-2 text-destructive">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
            <span className="font-medium">LIVE</span>
          </div>
        )}
        
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left column - Scoreboard */}
          <div className="lg:col-span-2 space-y-4">
            <ScoreBoard 
              liveState={liveState} 
              matchInfo={match}
              teamName={teamSettings?.team_name}
            />
            
            {/* Batsmen */}
            <div className="grid md:grid-cols-2 gap-4">
              <BatsmanCard
                player={striker}
                stats={strikerStats}
                isStriker={true}
              />
              <BatsmanCard
                player={nonStriker}
                stats={nonStrikerStats}
                isStriker={false}
              />
            </div>
            
            {/* Bowler & Over Summary */}
            <div className="grid md:grid-cols-2 gap-4">
              <BowlerCard
                player={bowler}
                stats={bowlerStats}
              />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">This Over</CardTitle>
                </CardHeader>
                <CardContent>
                  <OverSummary balls={currentOverBalls} currentOver={liveState.overs} />
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Right column - Commentary */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Ball by Ball</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {recentBalls.map((ball, idx) => (
                      <div 
                        key={ball.id || idx}
                        className={`text-sm p-2 rounded-lg ${
                          ball.is_wicket ? 'bg-destructive/10 text-destructive' :
                          ball.is_boundary && ball.runs_scored === 6 ? 'bg-purple-500/10 text-purple-600' :
                          ball.is_boundary && ball.runs_scored === 4 ? 'bg-green-500/10 text-green-600' :
                          'bg-muted/50'
                        }`}
                      >
                        {getBallCommentary(ball)}
                      </div>
                    ))}
                    
                    {recentBalls.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No balls bowled yet
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
