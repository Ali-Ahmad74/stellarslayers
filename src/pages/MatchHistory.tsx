import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, MapPin, ChevronDown, ChevronUp, X } from 'lucide-react';
import { SeasonFilter } from '@/components/SeasonFilter';
import { HeadToHead } from '@/components/HeadToHead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiteFooter } from '@/components/SiteFooter';
import { MatchScorecard } from '@/components/MatchScorecard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Match {
  id: number;
  match_date: string;
  venue: string | null;
  overs: number;
  opponent_name: string | null;
  our_score: number | null;
  opponent_score: number | null;
  result: string | null;
  tournament_id?: number | null;
  tournaments?: { name: string } | null;
  series_id?: number | null;
  series?: { name: string } | null;
}

interface TournamentOption {
  id: number;
  name: string;
}

interface SeriesOption {
  id: number;
  name: string;
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
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('all');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');

  // Get unique years from matches
  const years = useMemo(() => {
    const uniqueYears = [...new Set(matches.map(m => new Date(m.match_date).getFullYear()))];
    return uniqueYears.sort((a, b) => b - a);
  }, [matches]);

  // Filter matches by selected year
  const filteredMatches = useMemo(() => {
    let list = matches;
    if (selectedYear !== 'all') {
      list = list.filter(m => new Date(m.match_date).getFullYear().toString() === selectedYear);
    }

    if (selectedTournamentId !== 'all') {
      if (selectedTournamentId === 'none') {
        list = list.filter((m) => !m.tournament_id);
      } else {
        const tid = Number(selectedTournamentId);
        list = list.filter((m) => Number(m.tournament_id) === tid);
      }
    }

    if (selectedSeriesId !== 'all') {
      if (selectedSeriesId === 'none') {
        list = list.filter((m) => !m.series_id);
      } else {
        const sid = Number(selectedSeriesId);
        list = list.filter((m) => Number(m.series_id) === sid);
      }
    }

    return list;
  }, [matches, selectedYear, selectedTournamentId, selectedSeriesId]);

  const fetchMatches = async () => {
    const [{ data: matchesData }, { data: tournamentsData }, { data: seriesData }] = await Promise.all([
      supabase
        .from('matches')
        .select('*, tournaments(name), series(name)')
        .order('match_date', { ascending: false }),
      supabase
        .from('tournaments')
        .select('id, name')
        .order('start_date', { ascending: false }),
      supabase
        .from('series')
        .select('id, name')
        .order('start_date', { ascending: false }),
    ]);

    setMatches((matchesData as any) || []);
    setTournaments((tournamentsData as any) || []);
    setSeriesOptions((seriesData as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const toggleExpand = async (matchId: number) => {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
    } else {
      setExpandedMatchId(matchId);
    }
  };

  const resultBadgeVariant = (result: string | null) => {
    if (!result) return 'secondary' as const;
    if (result === 'Won') return 'default' as const;
    if (result === 'Lost') return 'destructive' as const;
    return 'secondary' as const;
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tournament</span>
              <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="All tournaments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tournaments</SelectItem>
                  <SelectItem value="none">No tournament</SelectItem>
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Series</span>
              <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="All series" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All series</SelectItem>
                  <SelectItem value="none">No series</SelectItem>
                  {seriesOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTournamentId !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setSelectedTournamentId('all')}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
            {selectedSeriesId !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setSelectedSeriesId('all')}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
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
                          {(match.tournaments?.name || (!match.tournament_id && selectedTournamentId !== 'all')) && (
                            <div className="mt-1">
                              <Badge variant="secondary">
                                {match.tournament_id ? match.tournaments?.name : 'No tournament'}
                              </Badge>
                            </div>
                          )}
                          {match.series?.name && (
                            <div className="mt-2">
                              <Badge variant="outline">{match.series.name}</Badge>
                            </div>
                          )}
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
                          <Badge variant={resultBadgeVariant(match.result)}>
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
                        <MatchScorecard matchId={match.id} />
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