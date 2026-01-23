import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, Legend
} from 'recharts';

interface PerformanceData {
  date: string;
  runs: number;
  balls: number;
  wickets: number;
  catches: number;
  strikeRate: number;
}

interface PlayerPerformanceChartProps {
  playerId: number;
  playerName: string;
}

export function PlayerPerformanceChart({ playerId, playerName }: PlayerPerformanceChartProps) {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [activeChart, setActiveChart] = useState('batting');

  useEffect(() => {
    const fetchPerformanceData = async () => {
      setLoading(true);

      // Fetch batting data with match dates
      const { data: battingData } = await supabase
        .from('batting_inputs')
        .select('runs, balls, fours, sixes, matches(match_date)')
        .eq('player_id', playerId)
        .order('matches(match_date)', { ascending: true });

      // Fetch bowling data with match dates
      const { data: bowlingData } = await supabase
        .from('bowling_inputs')
        .select('wickets, runs_conceded, balls, matches(match_date)')
        .eq('player_id', playerId)
        .order('matches(match_date)', { ascending: true });

      // Fetch fielding data with match dates
      const { data: fieldingData } = await supabase
        .from('fielding_inputs')
        .select('catches, runouts, stumpings, matches(match_date)')
        .eq('player_id', playerId)
        .order('matches(match_date)', { ascending: true });

      // Combine data by match date
      const combinedData: Record<string, PerformanceData> = {};

      (battingData || []).forEach((b: any) => {
        const date = b.matches?.match_date;
        if (date) {
          const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!combinedData[date]) {
            combinedData[date] = { date: formattedDate, runs: 0, balls: 0, wickets: 0, catches: 0, strikeRate: 0 };
          }
          combinedData[date].runs += b.runs || 0;
          combinedData[date].balls += b.balls || 0;
          combinedData[date].strikeRate = combinedData[date].balls > 0 
            ? Number(((combinedData[date].runs / combinedData[date].balls) * 100).toFixed(1))
            : 0;
        }
      });

      (bowlingData || []).forEach((b: any) => {
        const date = b.matches?.match_date;
        if (date) {
          const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!combinedData[date]) {
            combinedData[date] = { date: formattedDate, runs: 0, balls: 0, wickets: 0, catches: 0, strikeRate: 0 };
          }
          combinedData[date].wickets += b.wickets || 0;
        }
      });

      (fieldingData || []).forEach((f: any) => {
        const date = f.matches?.match_date;
        if (date) {
          const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!combinedData[date]) {
            combinedData[date] = { date: formattedDate, runs: 0, balls: 0, wickets: 0, catches: 0, strikeRate: 0 };
          }
          combinedData[date].catches += (f.catches || 0) + (f.runouts || 0) + (f.stumpings || 0);
        }
      });

      // Sort by date and convert to array
      const sortedData = Object.entries(combinedData)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([, data]) => data);

      setPerformanceData(sortedData);
      setLoading(false);
    };

    if (playerId) {
      fetchPerformanceData();
    }
  }, [playerId]);

  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (performanceData.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Performance Trends</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          No performance data available yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="text-lg">📈 Performance Trends - {playerName}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeChart} onValueChange={setActiveChart}>
          <TabsList className="mb-4">
            <TabsTrigger value="batting">🏏 Batting</TabsTrigger>
            <TabsTrigger value="bowling">🎯 Bowling</TabsTrigger>
            <TabsTrigger value="fielding">🧤 Fielding</TabsTrigger>
            <TabsTrigger value="all">📊 All</TabsTrigger>
          </TabsList>

          <TabsContent value="batting">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="runsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                  dataKey="runs"
                  stroke="hsl(var(--primary))"
                  fill="url(#runsGradient)"
                  strokeWidth={2}
                  name="Runs"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="bowling">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="wickets" 
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]}
                  name="Wickets"
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="fielding">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="catches" 
                  fill="hsl(var(--secondary))" 
                  radius={[4, 4, 0, 0]}
                  name="Dismissals"
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="all">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="runs" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Runs"
                />
                <Line 
                  type="monotone" 
                  dataKey="wickets" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Wickets"
                />
                <Line 
                  type="monotone" 
                  dataKey="catches" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Dismissals"
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}