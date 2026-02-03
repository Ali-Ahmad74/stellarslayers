import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLiveMatch, useBallByBall, getCurrentOverBalls, getBatsmanStats, getBowlerStats } from '@/hooks/useLiveMatch';
import { useTeamSettings } from '@/hooks/useTeamSettings';
import { Header } from '@/components/Header';
import { ScoreBoard } from '@/components/scoring/ScoreBoard';
import { BatsmanCard } from '@/components/scoring/BatsmanCard';
import { BowlerCard } from '@/components/scoring/BowlerCard';
import { OverSummary } from '@/components/scoring/OverSummary';
import { LiveScoringPanel } from '@/components/scoring/LiveScoringPanel';
import { PlayerSelector } from '@/components/scoring/PlayerSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Play, Square, Users } from 'lucide-react';

export default function Scorer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const matchId = id ? parseInt(id) : null;
  const { isAdmin } = useAuth();
  const { teamSettings } = useTeamSettings();
  
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'striker' | 'non-striker' | 'bowler' | 'new-batsman'>('striker');
  
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
  
  const { liveState, upsertState, updateState } = useLiveMatch(matchId);
  const { balls, addBall, undoLastBall } = useBallByBall(matchId, liveState?.current_innings);
  
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

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) {
      toast.error('Admin access required');
      navigate('/');
    }
  }, [isAdmin, navigate]);
  
  // Initialize live state if not exists
  const handleStartMatch = async () => {
    if (!matchId) return;
    
    try {
      await upsertState.mutateAsync({
        match_id: matchId,
        is_live: true,
        match_status: 'live',
        current_innings: 1,
        total_runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
      });
      toast.success('Match started!');
    } catch (error) {
      toast.error('Failed to start match');
    }
  };
  
  const handleEndInnings = async () => {
    if (!liveState) return;
    
    const target = liveState.total_runs + 1;
    
    try {
      await updateState.mutateAsync({
        current_innings: 2,
        match_status: liveState.current_innings === 1 ? 'innings_break' : 'completed',
        target: liveState.current_innings === 1 ? target : undefined,
        total_runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        current_striker_id: null,
        current_non_striker_id: null,
        current_bowler_id: null,
      });
      toast.success(liveState.current_innings === 1 ? 'Innings ended. Target: ' + target : 'Match completed!');
    } catch (error) {
      toast.error('Failed to end innings');
    }
  };
  
  const handleScoreBall = async (
    runs: number,
    extras?: { type: string; runs: number },
    isWicket?: boolean,
    wicketDetails?: { type: string; fielderId: number | null }
  ) => {
    if (!matchId || !liveState || !bowler) return;
    
    const isBoundary = !extras && (runs === 4 || runs === 6);
    const extrasType = extras?.type || null;
    const extrasRuns = extras?.runs || 0;
    
    // Determine if this is a legal delivery
    const isLegalDelivery = !extrasType || (extrasType !== 'wide' && extrasType !== 'noball');
    
    // Calculate new over/ball numbers
    let newOvers = liveState.overs;
    let newBalls = liveState.balls;
    
    if (isLegalDelivery) {
      newBalls++;
      if (newBalls >= 6) {
        newOvers++;
        newBalls = 0;
      }
    }
    
    // Total runs scored on this ball
    const totalBallRuns = runs + extrasRuns;
    
    // Add ball to database
    try {
      await addBall.mutateAsync({
        match_id: matchId,
        innings: liveState.current_innings,
        over_number: liveState.overs,
        ball_number: liveState.balls,
        batsman_id: striker?.id || null,
        bowler_id: bowler.id,
        runs_scored: runs,
        extras_type: extrasType,
        extras_runs: extrasRuns,
        is_wicket: isWicket || false,
        wicket_type: wicketDetails?.type || null,
        fielder_id: wicketDetails?.fielderId || null,
        is_boundary: isBoundary,
      });
      
      // Update match state
      const newWickets = liveState.wickets + (isWicket ? 1 : 0);
      
      // Rotate strike on odd runs or end of over
      const shouldRotateStrike = (totalBallRuns % 2 === 1) || (isLegalDelivery && newBalls === 0);
      
      await updateState.mutateAsync({
        total_runs: liveState.total_runs + totalBallRuns,
        wickets: newWickets,
        overs: newOvers,
        balls: newBalls,
        current_striker_id: shouldRotateStrike ? liveState.current_non_striker_id : liveState.current_striker_id,
        current_non_striker_id: shouldRotateStrike ? liveState.current_striker_id : liveState.current_non_striker_id,
        // Clear striker if wicket
        ...(isWicket && { current_striker_id: shouldRotateStrike ? null : liveState.current_non_striker_id }),
      });
      
      // If wicket, prompt for new batsman
      if (isWicket && newWickets < 10) {
        setSelectorMode('new-batsman');
        setSelectorOpen(true);
      }
      
    } catch (error) {
      toast.error('Failed to record ball');
    }
  };
  
  const handleUndo = async () => {
    if (!balls.length || !liveState) return;
    
    const lastBall = balls[balls.length - 1];
    
    try {
      await undoLastBall.mutateAsync();
      
      // Recalculate state from remaining balls
      const remainingBalls = balls.slice(0, -1);
      const inningsBalls = remainingBalls.filter(b => b.innings === liveState.current_innings);
      
      const totalRuns = inningsBalls.reduce((sum, b) => sum + b.runs_scored + b.extras_runs, 0);
      const wickets = inningsBalls.filter(b => b.is_wicket).length;
      const legalBalls = inningsBalls.filter(b => !b.extras_type || (b.extras_type !== 'wide' && b.extras_type !== 'noball')).length;
      
      await updateState.mutateAsync({
        total_runs: totalRuns,
        wickets,
        overs: Math.floor(legalBalls / 6),
        balls: legalBalls % 6,
      });
      
      toast.success('Ball undone');
    } catch (error) {
      toast.error('Failed to undo');
    }
  };
  
  const handleRotateStrike = async () => {
    if (!liveState) return;
    
    await updateState.mutateAsync({
      current_striker_id: liveState.current_non_striker_id,
      current_non_striker_id: liveState.current_striker_id,
    });
  };
  
  const handlePlayerSelect = async (player: { id: number; name: string }) => {
    if (!liveState) return;
    
    try {
      switch (selectorMode) {
        case 'striker':
        case 'new-batsman':
          await updateState.mutateAsync({ current_striker_id: player.id });
          break;
        case 'non-striker':
          await updateState.mutateAsync({ current_non_striker_id: player.id });
          break;
        case 'bowler':
          await updateState.mutateAsync({ current_bowler_id: player.id });
          break;
      }
    } catch (error) {
      toast.error('Failed to select player');
    }
  };
  
  const openSelector = (mode: typeof selectorMode) => {
    setSelectorMode(mode);
    setSelectorOpen(true);
  };
  
  // Get IDs to exclude from selector
  const excludeIds = useMemo(() => {
    const ids: number[] = [];
    if (selectorMode === 'striker' || selectorMode === 'new-batsman') {
      if (nonStriker) ids.push(nonStriker.id);
    }
    if (selectorMode === 'non-striker') {
      if (striker) ids.push(striker.id);
    }
    // For batsmen, exclude already-out batsmen
    if (selectorMode === 'striker' || selectorMode === 'non-striker' || selectorMode === 'new-batsman') {
      const outBatsmenIds = balls
        .filter(b => b.is_wicket && b.innings === liveState?.current_innings)
        .map(b => b.batsman_id)
        .filter((id): id is number => id !== null);
      ids.push(...outBatsmenIds);
    }
    return ids;
  }, [selectorMode, striker, nonStriker, balls, liveState?.current_innings]);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-4 md:py-6 space-y-4">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>
        
        {/* Not started state */}
        {(!liveState || liveState.match_status === 'not_started') && (
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-2xl font-bold mb-4">
                {teamSettings?.team_name || 'Stellar Slayers'} vs {match.opponent_name || 'Opponent'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {match.venue && `${match.venue} • `}
                {match.overs} overs match
              </p>
              <Button size="lg" onClick={handleStartMatch}>
                <Play className="h-5 w-5 mr-2" />
                Start Live Scoring
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Live scoring interface */}
        {liveState && liveState.match_status !== 'not_started' && (
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
                  onSelect={() => openSelector('striker')}
                  isSelectable={!striker}
                />
                <BatsmanCard
                  player={nonStriker}
                  stats={nonStrikerStats}
                  isStriker={false}
                  onSelect={() => openSelector('non-striker')}
                  isSelectable={!nonStriker}
                />
              </div>
              
              {/* Bowler & Over Summary */}
              <div className="grid md:grid-cols-2 gap-4">
                <BowlerCard
                  player={bowler}
                  stats={bowlerStats}
                  onSelect={() => openSelector('bowler')}
                  isSelectable={!bowler}
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
            
            {/* Right column - Scoring Panel */}
            <div className="space-y-4">
              <LiveScoringPanel
                striker={striker}
                nonStriker={nonStriker}
                bowler={bowler}
                allPlayers={players}
                onScoreBall={handleScoreBall}
                onUndo={handleUndo}
                onRotateStrike={handleRotateStrike}
                disabled={liveState.match_status !== 'live'}
              />
              
              {/* Match controls */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openSelector('bowler')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Change Bowler
                  </Button>
                  
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleEndInnings}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    {liveState.current_innings === 1 ? 'End 1st Innings' : 'End Match'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      
      <PlayerSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        title={
          selectorMode === 'striker' ? 'Select Striker' :
          selectorMode === 'non-striker' ? 'Select Non-Striker' :
          selectorMode === 'new-batsman' ? 'New Batsman' :
          'Select Bowler'
        }
        players={players}
        excludeIds={excludeIds}
        onSelect={handlePlayerSelect}
      />
    </div>
  );
}
