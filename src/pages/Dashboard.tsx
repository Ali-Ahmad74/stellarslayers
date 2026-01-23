import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerRankings } from '@/hooks/usePlayerRankings';
import { Loader2, Trophy, Target, TrendingUp, Users, Calendar, Zap, Award, Activity } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { SeasonFilter } from '@/components/SeasonFilter';
import { SiteFooter } from '@/components/SiteFooter';

interface Match {
  id: number;
  match_date: string;
  result: string | null;
  our_score: number | null;
  opponent_score: number | null;
}

const Dashboard = () => {
  const { players, loading: playersLoading } = usePlayerRankings();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true });
      setMatches(data || []);
      setLoading(false);
    };
    fetchMatches();
  }, []);

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

  const isLoading = loading || playersLoading;

  // Calculate team statistics (using filtered matches)
  const totalMatches = filteredMatches.length;
  const wins = filteredMatches.filter(m => m.result === 'Won').length;
  const losses = filteredMatches.filter(m => m.result === 'Lost').length;
  const draws = filteredMatches.filter(m => m.result === 'Tied' || m.result === 'Draw').length;
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0';

  const totalRuns = players.reduce((sum, p) => sum + (p.stats?.total_runs || 0), 0);
  const totalWickets = players.reduce((sum, p) => sum + (p.stats?.wickets || 0), 0);
  const totalCatches = players.reduce((sum, p) => sum + (p.stats?.catches || 0), 0);
  const totalSixes = players.reduce((sum, p) => sum + (p.stats?.sixes || 0), 0);
  const totalFours = players.reduce((sum, p) => sum + (p.stats?.fours || 0), 0);
  const totalFifties = players.reduce((sum, p) => sum + (p.stats?.fifties || 0), 0);
  const totalHundreds = players.reduce((sum, p) => sum + (p.stats?.hundreds || 0), 0);
  const totalThreeFers = players.reduce((sum, p) => sum + (p.stats?.three_fers || 0), 0);
  const totalFiveFers = players.reduce((sum, p) => sum + (p.stats?.five_fers || 0), 0);

  // Top performers
  const topScorer = players.reduce((top, p) => 
    (p.stats?.total_runs || 0) > (top?.stats?.total_runs || 0) ? p : top, players[0]);
  const topWicketTaker = players.reduce((top, p) => 
    (p.stats?.wickets || 0) > (top?.stats?.wickets || 0) ? p : top, players[0]);
  const topFielder = players.reduce((top, p) => 
    (p.stats?.catches || 0) > (top?.stats?.catches || 0) ? p : top, players[0]);

  // Win/Loss pie chart data
  const resultData = [
    { name: 'Wins', value: wins, color: 'hsl(var(--success))' },
    { name: 'Losses', value: losses, color: 'hsl(var(--destructive))' },
    { name: 'Draws/Ties', value: draws, color: 'hsl(var(--accent))' },
  ].filter(d => d.value > 0);

  // Monthly performance data (using filtered matches)
  const monthlyData = filteredMatches.reduce((acc: any[], match) => {
    const month = new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const existing = acc.find(m => m.month === month);
    if (existing) {
      existing.matches += 1;
      existing.wins += match.result === 'Won' ? 1 : 0;
      existing.runs += match.our_score || 0;
    } else {
      acc.push({
        month,
        matches: 1,
        wins: match.result === 'Won' ? 1 : 0,
        runs: match.our_score || 0,
      });
    }
    return acc;
  }, []);

  // Role distribution
  const roleData = players.reduce((acc: any[], p) => {
    const existing = acc.find(r => r.name === p.role);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: p.role, value: 1 });
    }
    return acc;
  }, []);

  const ROLE_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(160, 84%, 39%)'];

  if (isLoading) {
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
          className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground font-serif text-center md:text-left">
              📊 Team Dashboard
            </h1>
            <p className="text-muted-foreground text-center md:text-left">
              Comprehensive overview of team performance
            </p>
          </div>
          <SeasonFilter 
            years={years} 
            selectedYear={selectedYear} 
            onYearChange={setSelectedYear} 
          />
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          {[
            { label: 'Matches', value: totalMatches, icon: Calendar, color: 'text-primary' },
            { label: 'Win Rate', value: `${winRate}%`, icon: Trophy, color: 'text-emerald-500' },
            { label: 'Total Runs', value: totalRuns.toLocaleString(), icon: Zap, color: 'text-amber-500' },
            { label: 'Wickets', value: totalWickets, icon: Target, color: 'text-red-500' },
            { label: 'Catches', value: totalCatches, icon: Activity, color: 'text-blue-500' },
            { label: 'Sixes', value: totalSixes, icon: TrendingUp, color: 'text-purple-500' },
            { label: 'Players', value: players.length, icon: Users, color: 'text-cyan-500' },
            { label: '50s/100s', value: `${totalFifties}/${totalHundreds}`, icon: Award, color: 'text-orange-500' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card variant="stat" className="h-full">
                <CardContent className="p-4 text-center">
                  <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Win/Loss Pie Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="elevated" className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Match Results</CardTitle>
              </CardHeader>
              <CardContent>
                {resultData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={resultData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {resultData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No match data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Performance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card variant="elevated" className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="wins"
                        stackId="1"
                        stroke="hsl(var(--success))"
                        fill="hsl(var(--success))"
                        fillOpacity={0.6}
                        name="Wins"
                      />
                      <Area
                        type="monotone"
                        dataKey="matches"
                        stackId="2"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        name="Matches"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No match data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Performers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">🏆 Top Performers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Top Run Scorer', player: topScorer, stat: topScorer?.stats?.total_runs || 0, label: 'Runs', icon: '🏏', color: 'from-emerald-500 to-teal-600' },
              { title: 'Top Wicket Taker', player: topWicketTaker, stat: topWicketTaker?.stats?.wickets || 0, label: 'Wickets', icon: '🎯', color: 'from-red-500 to-rose-600' },
              { title: 'Top Fielder', player: topFielder, stat: topFielder?.stats?.catches || 0, label: 'Catches', icon: '🧤', color: 'from-blue-500 to-indigo-600' },
            ].map((item, index) => (
              <Card key={item.title} variant="performer">
                <CardHeader className={`bg-gradient-to-r ${item.color} text-white rounded-t-xl`}>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{item.icon}</span>
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold font-display text-primary mb-2">
                    {item.stat}
                  </div>
                  <p className="text-lg font-semibold">{item.player?.name || 'N/A'}</p>
                  <p className="text-muted-foreground text-sm">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Team Composition & Milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Role Distribution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg">Team Composition</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={roleData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Players" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Milestones */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg">Team Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: '30+ Scores', value: players.reduce((sum, p) => sum + (p.stats?.thirties || 0), 0), icon: '🎯' },
                    { label: '50+ Scores', value: totalFifties, icon: '⭐' },
                    { label: '100+ Scores', value: totalHundreds, icon: '💯' },
                    { label: '3+ Wickets', value: totalThreeFers, icon: '🔥' },
                    { label: '5+ Wickets', value: totalFiveFers, icon: '🏆' },
                    { label: 'Total Fours', value: totalFours, icon: '4️⃣' },
                  ].map((milestone) => (
                    <div key={milestone.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="text-2xl">{milestone.icon}</span>
                      <div>
                        <p className="text-xl font-bold">{milestone.value}</p>
                        <p className="text-xs text-muted-foreground">{milestone.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Dashboard;