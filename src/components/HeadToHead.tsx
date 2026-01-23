import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trophy, Target, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Match {
  id: number;
  match_date: string;
  venue: string | null;
  opponent_name: string | null;
  our_score: number | null;
  opponent_score: number | null;
  result: string | null;
  overs: number;
}

interface HeadToHeadStats {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  totalRunsScored: number;
  totalRunsConceded: number;
  highestScore: number;
  lowestScore: number;
  avgScore: number;
  lastResult: string | null;
}

export const HeadToHead = () => {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: false });
      
      const matches = data || [];
      setAllMatches(matches);
      
      // Extract unique opponents
      const uniqueOpponents = [...new Set(
        matches
          .map(m => m.opponent_name)
          .filter((name): name is string => !!name)
      )].sort();
      
      setOpponents(uniqueOpponents);
      setLoading(false);
    };
    
    fetchMatches();
  }, []);

  const getHeadToHeadStats = (opponent: string): HeadToHeadStats => {
    const matches = allMatches.filter(m => m.opponent_name === opponent);
    
    const wins = matches.filter(m => m.result === 'Won').length;
    const losses = matches.filter(m => m.result === 'Lost').length;
    const draws = matches.filter(m => m.result === 'Tied' || m.result === 'Draw').length;
    
    const scores = matches.map(m => m.our_score || 0).filter(s => s > 0);
    const opponentScores = matches.map(m => m.opponent_score || 0);
    
    return {
      matches: matches.length,
      wins,
      losses,
      draws,
      totalRunsScored: scores.reduce((a, b) => a + b, 0),
      totalRunsConceded: opponentScores.reduce((a, b) => a + b, 0),
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      lastResult: matches[0]?.result || null,
    };
  };

  const opponentMatches = selectedOpponent 
    ? allMatches.filter(m => m.opponent_name === selectedOpponent)
    : [];

  const stats = selectedOpponent ? getHeadToHeadStats(selectedOpponent) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            Head-to-Head Record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Select Opponent
            </label>
            <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Choose an opponent..." />
              </SelectTrigger>
              <SelectContent>
                {opponents.map((opponent) => (
                  <SelectItem key={opponent} value={opponent}>
                    {opponent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {opponents.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No opponents recorded yet. Add matches with opponent names to see head-to-head stats.
            </p>
          )}

          {selectedOpponent && stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <Calendar className="w-5 h-5 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stats.matches}</p>
                  <p className="text-xs text-muted-foreground">Matches</p>
                </div>
                <div className="text-center p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Trophy className="w-5 h-5 mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.wins}</p>
                  <p className="text-xs text-muted-foreground">Wins</p>
                </div>
                <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <Target className="w-5 h-5 mx-auto mb-2 text-red-600 dark:text-red-400" />
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.losses}</p>
                  <p className="text-xs text-muted-foreground">Losses</p>
                </div>
                <div className="text-center p-4 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <TrendingUp className="w-5 h-5 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.draws}</p>
                  <p className="text-xs text-muted-foreground">Draws</p>
                </div>
              </div>

              {/* Win Rate */}
              <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Win Rate vs {selectedOpponent}</span>
                  <span className="text-xl font-bold text-primary">
                    {stats.matches > 0 ? ((stats.wins / stats.matches) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div className="flex h-full">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0}%` }}
                    />
                    <div 
                      className="bg-amber-500 h-full" 
                      style={{ width: `${stats.matches > 0 ? (stats.draws / stats.matches) * 100 : 0}%` }}
                    />
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ width: `${stats.matches > 0 ? (stats.losses / stats.matches) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xl font-bold text-primary">{stats.totalRunsScored}</p>
                  <p className="text-xs text-muted-foreground">Total Runs Scored</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xl font-bold text-primary">{stats.avgScore}</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xl font-bold text-primary">{stats.highestScore}</p>
                  <p className="text-xs text-muted-foreground">Highest Score</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xl font-bold text-primary">{stats.lowestScore}</p>
                  <p className="text-xs text-muted-foreground">Lowest Score</p>
                </div>
              </div>

              {/* Match History vs Opponent */}
              <div>
                <h4 className="font-semibold mb-3">Match History vs {selectedOpponent}</h4>
                <div className="space-y-2">
                  {opponentMatches.map((match) => (
                    <div 
                      key={match.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {match.result === 'Won' ? '🏆' : match.result === 'Lost' ? '😔' : '🤝'}
                        </span>
                        <div>
                          <p className="text-sm">
                            {new Date(match.match_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          {match.venue && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {match.venue}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold">
                          {match.our_score} - {match.opponent_score}
                        </span>
                        <Badge className={
                          match.result === 'Won' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : match.result === 'Lost'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }>
                          {match.result || 'TBD'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
