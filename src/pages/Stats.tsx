import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerRankings } from '@/hooks/usePlayerRankings';
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
const Stats = () => {
  const {
    players,
    loading: playersLoading
  } = usePlayerRankings();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchMatches = async () => {
    const {
      data
    } = await supabase.from('matches').select('*').order('match_date', {
      ascending: false
    });
    setMatches(data || []);
    setLoading(false);
  };
  useEffect(() => {
    fetchMatches();

    // Subscribe to realtime updates
    const matchesChannel = supabase.channel('matches-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'matches'
    }, () => {
      logger.log('Matches changed, refetching...');
      fetchMatches();
    }).subscribe();
    return () => {
      supabase.removeChannel(matchesChannel);
    };
  }, []);

  // Calculate team totals from real data
  const totalMatches = matches.length;
  const totalRuns = players.reduce((sum, p) => sum + (p.stats?.total_runs || 0), 0);
  const totalWickets = players.reduce((sum, p) => sum + (p.stats?.wickets || 0), 0);
  const totalCatches = players.reduce((sum, p) => sum + (p.stats?.catches || 0), 0);
  const totalSixes = players.reduce((sum, p) => sum + (p.stats?.sixes || 0), 0);
  const totalFours = players.reduce((sum, p) => sum + (p.stats?.fours || 0), 0);

  // Calculate win/loss record
  const wins = matches.filter(m => m.result === 'Won').length;
  const losses = matches.filter(m => m.result === 'Lost').length;

  // Find top performers
  const topScorer = players.reduce((top, player) => {
    const runs = player.stats?.total_runs || 0;
    const topRuns = top?.stats?.total_runs || 0;
    return runs > topRuns ? player : top;
  }, players[0]);
  const topWicketTaker = players.reduce((top, player) => {
    const wickets = player.stats?.wickets || 0;
    const topWickets = top?.stats?.wickets || 0;
    return wickets > topWickets ? player : top;
  }, players[0]);
  const stats = [{
    icon: '🏏',
    label: 'Total Runs',
    value: totalRuns.toLocaleString(),
    color: 'from-emerald-500 to-teal-600'
  }, {
    icon: '🎯',
    label: 'Total Wickets',
    value: totalWickets,
    color: 'from-red-500 to-rose-600'
  }, {
    icon: '🧤',
    label: 'Total Catches',
    value: totalCatches,
    color: 'from-blue-500 to-indigo-600'
  }, {
    icon: '💥',
    label: 'Sixes Hit',
    value: totalSixes,
    color: 'from-amber-500 to-orange-600'
  }, {
    icon: '4️⃣',
    label: 'Fours Hit',
    value: totalFours,
    color: 'from-purple-500 to-pink-600'
  }, {
    icon: '🎮',
    label: 'Matches Played',
    value: totalMatches,
    color: 'from-cyan-500 to-blue-600'
  }];
  const isLoading = loading || playersLoading;
  if (isLoading) {
    return <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 md:py-12">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }}>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-serif text-center">
            📊 Team Statistics
          </h1>
          <p className="text-muted-foreground mb-8">
            Performance overview • Record: {wins}W - {losses}L
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {stats.map((stat, index) => <motion.div key={stat.label} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: index * 0.1
        }}>
              <Card variant="elevated" className="overflow-hidden">
                <div className={`bg-gradient-to-r ${stat.color} p-4 text-white text-center`}>
                  <span className="text-3xl mb-2 block">{stat.icon}</span>
                  <p className="text-3xl font-bold font-mono text-center">{stat.value}</p>
                </div>
                <CardContent className="p-3 text-center">
                  <p className="text-sm font-medium text-muted-foreground font-serif">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>)}
        </div>

        {/* Top Performers */}
        {players.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <motion.div initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.3
        }}>
              <Card variant="elevated">
                <CardHeader className="bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    Top Run Scorer
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-bold font-display text-primary mb-2">
                    {topScorer?.stats?.total_runs || 0}
                  </div>
                  <p className="text-xl font-semibold font-serif text-center">{topScorer?.name || 'N/A'}</p>
                  <p className="text-muted-foreground font-mono">Total Runs</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.4
        }}>
              <Card variant="elevated">
                <CardHeader className="bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🎯</span>
                    Top Wicket Taker
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-bold font-display text-primary mb-2">
                    {topWicketTaker?.stats?.wickets || 0}
                  </div>
                  <p className="text-xl font-semibold font-serif">{topWicketTaker?.name || 'N/A'}</p>
                  <p className="text-muted-foreground font-mono text-center">Total Wickets</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>}

        {/* Recent Matches with Results */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.5
      }}>
          <Card variant="elevated">
            <CardHeader className="gradient-header text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                Recent Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {matches.length === 0 ? <div className="p-8 text-center text-muted-foreground">
                  No matches recorded yet
                </div> : <div className="divide-y divide-border">
                  {matches.map(match => <div key={match.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${match.result === 'Won' ? 'bg-emerald-100 dark:bg-emerald-900/30' : match.result === 'Lost' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary/10'}`}>
                          <span className="text-xl">
                            {match.result === 'Won' ? '🏆' : match.result === 'Lost' ? '😔' : '🏏'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-justify">
                            {match.opponent_name ? `vs ${match.opponent_name}` : match.venue || 'Match'}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {new Date(match.match_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                            {match.venue && ` • ${match.venue}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        {match.our_score !== null && match.opponent_score !== null && <div className="text-right">
                            <p className="font-bold text-lg font-serif">
                              {match.our_score} - {match.opponent_score}
                            </p>
                            <p className="text-xs text-muted-foreground">{match.overs} overs</p>
                          </div>}
                        {match.result && <span className={`inline-flex items-center px-3 py-1 rounded-full font-medium text-sm ${match.result === 'Won' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : match.result === 'Lost' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : match.result === 'Tied' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                            {match.result}
                          </span>}
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>;
};
export default Stats;