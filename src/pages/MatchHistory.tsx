import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, MapPin, Trophy, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SeasonFilter } from '@/components/SeasonFilter';
import { HeadToHead } from '@/components/HeadToHead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiteFooter } from '@/components/SiteFooter';

interface Match {
  id: number;
  match_date: string;
  venue: string | null;
  overs: number;
  opponent_name: string | null;
  our_score: number | null;
  opponent_score: number | null;
  result: string | null;
}

interface BattingScorecard {
  player_id: number;
  player_name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
}

interface BowlingScorecard {
  player_id: number;
  player_name: string;
  balls: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
  wides: number;
  no_balls: number;
}

interface FieldingScorecard {
  player_id: number;
  player_name: string;
  catches: number;
  runouts: number;
  stumpings: number;
}

const MatchHistory = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [battingScorecard, setBattingScorecard] = useState<BattingScorecard[]>([]);
  const [bowlingScorecard, setBowlingScorecard] = useState<BowlingScorecard[]>([]);
  const [fieldingScorecard, setFieldingScorecard] = useState<FieldingScorecard[]>([]);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Get unique years from matches
  const years = useMemo(() => {
    const uniqueYears = [...new Set(matches.map(m => new Date(m.match_date).getFullYear()))];
    return uniqueYears.sort((a, b) => b - a);
  }, [matches]);

  // Filter matches by selected year
  const filteredMatches = useMemo(() => {
    if (selectedYear === 'all') return matches;
    return matches.filter(m => new Date(m.match_date).getFullYear().toString() === selectedYear);
  }, [matches, selectedYear]);

  const fetchMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: false });
    setMatches(data || []);
    setLoading(false);
  };

  const fetchScorecard = async (matchId: number) => {
    setScorecardLoading(true);
    
    // Fetch batting data with player names
    const { data: battingData } = await supabase
      .from('batting_inputs')
      .select('*, players(name)')
      .eq('match_id', matchId)
      .order('runs', { ascending: false });

    // Fetch bowling data with player names
    const { data: bowlingData } = await supabase
      .from('bowling_inputs')
      .select('*, players(name)')
      .eq('match_id', matchId)
      .order('wickets', { ascending: false });

    // Fetch fielding data with player names
    const { data: fieldingData } = await supabase
      .from('fielding_inputs')
      .select('*, players(name)')
      .eq('match_id', matchId);

    setBattingScorecard(
      (battingData || []).map((b: any) => ({
        player_id: b.player_id,
        player_name: b.players?.name || 'Unknown',
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        out: b.out,
      }))
    );

    setBowlingScorecard(
      (bowlingData || []).map((b: any) => ({
        player_id: b.player_id,
        player_name: b.players?.name || 'Unknown',
        balls: b.balls,
        runs_conceded: b.runs_conceded,
        wickets: b.wickets,
        maidens: b.maidens,
        wides: b.wides,
        no_balls: b.no_balls,
      }))
    );

    setFieldingScorecard(
      (fieldingData || [])
        .filter((f: any) => f.catches > 0 || f.runouts > 0 || f.stumpings > 0)
        .map((f: any) => ({
          player_id: f.player_id,
          player_name: f.players?.name || 'Unknown',
          catches: f.catches,
          runouts: f.runouts,
          stumpings: f.stumpings,
        }))
    );

    setScorecardLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleViewScorecard = async (match: Match) => {
    setSelectedMatch(match);
    await fetchScorecard(match.id);
  };

  const toggleExpand = async (matchId: number) => {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
    } else {
      setExpandedMatchId(matchId);
      await fetchScorecard(matchId);
    }
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case 'Won': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Lost': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Tied': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Draw': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return remainingBalls > 0 ? `${overs}.${remainingBalls}` : `${overs}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-serif text-center">
            📅 Match History
          </h1>
          <p className="text-muted-foreground mb-8 text-center">
            All past matches with detailed scorecards
          </p>
        </motion.div>

        <Tabs defaultValue="matches" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <TabsList>
              <TabsTrigger value="matches">Match History</TabsTrigger>
              <TabsTrigger value="head-to-head">Head-to-Head</TabsTrigger>
            </TabsList>
            
            <SeasonFilter 
              years={years} 
              selectedYear={selectedYear} 
              onYearChange={setSelectedYear} 
            />
          </div>

          <TabsContent value="matches" className="space-y-6">
            {/* Match Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card variant="stat">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{filteredMatches.length}</p>
                  <p className="text-sm text-muted-foreground">Total Matches</p>
                </CardContent>
              </Card>
              <Card variant="stat">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-500">{filteredMatches.filter(m => m.result === 'Won').length}</p>
                  <p className="text-sm text-muted-foreground">Wins</p>
                </CardContent>
              </Card>
              <Card variant="stat">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-red-500">{filteredMatches.filter(m => m.result === 'Lost').length}</p>
                  <p className="text-sm text-muted-foreground">Losses</p>
                </CardContent>
              </Card>
              <Card variant="stat">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-amber-500">
                    {filteredMatches.filter(m => m.result === 'Tied' || m.result === 'Draw').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Draws/Ties</p>
                </CardContent>
              </Card>
            </div>

            {/* Match List */}
            <div className="space-y-4">
              {filteredMatches.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {selectedYear === 'all' ? 'No matches recorded yet' : `No matches in ${selectedYear}`}
                  </CardContent>
                </Card>
              ) : (
                filteredMatches.map((match, index) => (
                  <motion.div
                    key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card variant="elevated" className="overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleExpand(match.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                          match.result === 'Won' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                          match.result === 'Lost' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-primary/10'
                        }`}>
                          <span className="text-2xl">
                            {match.result === 'Won' ? '🏆' : match.result === 'Lost' ? '😔' : '🏏'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {match.opponent_name ? `vs ${match.opponent_name}` : 'Match'}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(match.match_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            {match.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {match.venue}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {match.our_score !== null && match.opponent_score !== null && (
                          <div className="text-right">
                            <p className="font-bold text-xl font-mono">
                              {match.our_score} - {match.opponent_score}
                            </p>
                            <p className="text-xs text-muted-foreground">{match.overs} overs</p>
                          </div>
                        )}
                        {match.result && (
                          <Badge className={getResultColor(match.result)}>
                            {match.result}
                          </Badge>
                        )}
                        {expandedMatchId === match.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Scorecard */}
                  <AnimatePresence>
                    {expandedMatchId === match.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t"
                      >
                        {scorecardLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="p-4 space-y-6">
                            {/* Batting Scorecard */}
                            {battingScorecard.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  🏏 Batting Scorecard
                                </h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Player</TableHead>
                                        <TableHead className="text-center">R</TableHead>
                                        <TableHead className="text-center">B</TableHead>
                                        <TableHead className="text-center">4s</TableHead>
                                        <TableHead className="text-center">6s</TableHead>
                                        <TableHead className="text-center">SR</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {battingScorecard.map((b) => (
                                        <TableRow key={b.player_id}>
                                          <TableCell className="font-medium">{b.player_name}</TableCell>
                                          <TableCell className="text-center font-bold">{b.runs}</TableCell>
                                          <TableCell className="text-center">{b.balls}</TableCell>
                                          <TableCell className="text-center">{b.fours}</TableCell>
                                          <TableCell className="text-center">{b.sixes}</TableCell>
                                          <TableCell className="text-center">
                                            {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Badge variant={b.out ? 'destructive' : 'secondary'}>
                                              {b.out ? 'Out' : 'Not Out'}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Bowling Scorecard */}
                            {bowlingScorecard.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  🎯 Bowling Scorecard
                                </h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Player</TableHead>
                                        <TableHead className="text-center">O</TableHead>
                                        <TableHead className="text-center">M</TableHead>
                                        <TableHead className="text-center">R</TableHead>
                                        <TableHead className="text-center">W</TableHead>
                                        <TableHead className="text-center">Econ</TableHead>
                                        <TableHead className="text-center">Extras</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {bowlingScorecard.map((b) => (
                                        <TableRow key={b.player_id}>
                                          <TableCell className="font-medium">{b.player_name}</TableCell>
                                          <TableCell className="text-center">{formatOvers(b.balls)}</TableCell>
                                          <TableCell className="text-center">{b.maidens}</TableCell>
                                          <TableCell className="text-center">{b.runs_conceded}</TableCell>
                                          <TableCell className="text-center font-bold">{b.wickets}</TableCell>
                                          <TableCell className="text-center">
                                            {b.balls > 0 ? ((b.runs_conceded / (b.balls / 6))).toFixed(2) : '0.00'}
                                          </TableCell>
                                          <TableCell className="text-center text-muted-foreground">
                                            {b.wides + b.no_balls > 0 ? `${b.wides}wd, ${b.no_balls}nb` : '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Fielding Highlights */}
                            {fieldingScorecard.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  🧤 Fielding Highlights
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {fieldingScorecard.map((f) => (
                                    <Badge key={f.player_id} variant="outline" className="py-2 px-3">
                                      {f.player_name}: 
                                      {f.catches > 0 && ` ${f.catches}c`}
                                      {f.runouts > 0 && ` ${f.runouts}ro`}
                                      {f.stumpings > 0 && ` ${f.stumpings}st`}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {battingScorecard.length === 0 && bowlingScorecard.length === 0 && (
                              <p className="text-center text-muted-foreground py-4">
                                No detailed scorecard available for this match
                              </p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))
          )}
            </div>
          </TabsContent>

          <TabsContent value="head-to-head">
            <HeadToHead />
          </TabsContent>
        </Tabs>
      </main>

      <SiteFooter />
    </div>
  );
};

export default MatchHistory;