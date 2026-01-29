import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Users, 
  Calendar, 
  Activity,
  Trophy,
  Loader2
} from 'lucide-react';

interface HealthCheck {
  id: string;
  label: string;
  description: string;
  status: 'loading' | 'pass' | 'warning' | 'error';
  count: number;
  details: string[];
  icon: React.ReactNode;
}

interface DataHealthDashboardProps {
  players: { id: number; name: string }[];
  matches: { id: number; match_date: string; venue: string | null; series_id?: number | null }[];
  series: { id: number; name: string }[];
}

export const DataHealthDashboard = ({ players, matches, series }: DataHealthDashboardProps) => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  const runHealthChecks = async () => {
    setIsAnalyzing(true);

    const initialChecks: HealthCheck[] = [
      {
        id: 'players_no_performance',
        label: 'Players Without Stats',
        description: 'Players who have never recorded any performance',
        status: 'loading',
        count: 0,
        details: [],
        icon: <Users className="w-5 h-5" />,
      },
      {
        id: 'matches_no_performance',
        label: 'Matches Without Performance Data',
        description: 'Matches with no batting, bowling, or fielding records',
        status: 'loading',
        count: 0,
        details: [],
        icon: <Calendar className="w-5 h-5" />,
      },
      {
        id: 'matches_no_series',
        label: 'Unassigned Matches',
        description: 'Matches not linked to any series',
        status: 'loading',
        count: 0,
        details: [],
        icon: <Trophy className="w-5 h-5" />,
      },
      {
        id: 'data_anomalies',
        label: 'Data Anomalies',
        description: 'Unusual or potentially incorrect data entries',
        status: 'loading',
        count: 0,
        details: [],
        icon: <Activity className="w-5 h-5" />,
      },
    ];

    setChecks(initialChecks);

    // Check 1: Players without any performance data
    const [{ data: battingPlayerIds }, { data: bowlingPlayerIds }, { data: fieldingPlayerIds }] = await Promise.all([
      supabase.from('batting_inputs').select('player_id'),
      supabase.from('bowling_inputs').select('player_id'),
      supabase.from('fielding_inputs').select('player_id'),
    ]);

    const playersWithPerformance = new Set([
      ...(battingPlayerIds || []).map(r => r.player_id),
      ...(bowlingPlayerIds || []).map(r => r.player_id),
      ...(fieldingPlayerIds || []).map(r => r.player_id),
    ]);

    const playersWithoutPerformance = players.filter(p => !playersWithPerformance.has(p.id));

    // Check 2: Matches without any performance records
    const [{ data: battingMatchIds }, { data: bowlingMatchIds }, { data: fieldingMatchIds }] = await Promise.all([
      supabase.from('batting_inputs').select('match_id'),
      supabase.from('bowling_inputs').select('match_id'),
      supabase.from('fielding_inputs').select('match_id'),
    ]);

    const matchesWithPerformance = new Set([
      ...(battingMatchIds || []).map(r => r.match_id),
      ...(bowlingMatchIds || []).map(r => r.match_id),
      ...(fieldingMatchIds || []).map(r => r.match_id),
    ]);

    const matchesWithoutPerformance = matches.filter(m => !matchesWithPerformance.has(m.id));

    // Check 3: Matches not assigned to any series
    const matchesNoSeries = matches.filter(m => !m.series_id);

    // Check 4: Data anomalies
    const anomalies: string[] = [];

    // Check for negative runs
    const { data: negativeRuns } = await supabase
      .from('batting_inputs')
      .select('player_id, match_id, runs')
      .lt('runs', 0);
    
    if (negativeRuns && negativeRuns.length > 0) {
      anomalies.push(`${negativeRuns.length} record(s) with negative runs`);
    }

    // Check for unrealistic strike rates (>400 with decent balls faced)
    const { data: highSR } = await supabase
      .from('batting_inputs')
      .select('player_id, runs, balls')
      .gt('balls', 5);

    const unrealisticSR = (highSR || []).filter(r => r.balls > 0 && (r.runs / r.balls) * 100 > 400);
    if (unrealisticSR.length > 0) {
      anomalies.push(`${unrealisticSR.length} record(s) with strike rate > 400`);
    }

    // Check for more wickets than balls bowled (per over)
    const { data: wicketCheck } = await supabase
      .from('bowling_inputs')
      .select('player_id, wickets, balls');

    const tooManyWickets = (wicketCheck || []).filter(r => r.balls > 0 && r.wickets > Math.ceil(r.balls / 6) * 6);
    if (tooManyWickets.length > 0) {
      anomalies.push(`${tooManyWickets.length} record(s) with more wickets than possible`);
    }

    // Check for matches with no result but have scores
    const matchesNoResult = matches.filter(m => 
      (m as any).our_score && (m as any).opponent_score && !(m as any).result
    );
    if (matchesNoResult.length > 0) {
      anomalies.push(`${matchesNoResult.length} match(es) with scores but no result`);
    }

    // Update all checks
    setChecks([
      {
        id: 'players_no_performance',
        label: 'Players Without Stats',
        description: 'Players who have never recorded any performance',
        status: playersWithoutPerformance.length === 0 ? 'pass' : players.length === 0 ? 'pass' : 'warning',
        count: playersWithoutPerformance.length,
        details: playersWithoutPerformance.map(p => p.name),
        icon: <Users className="w-5 h-5" />,
      },
      {
        id: 'matches_no_performance',
        label: 'Matches Without Performance Data',
        description: 'Matches with no batting, bowling, or fielding records',
        status: matchesWithoutPerformance.length === 0 ? 'pass' : matches.length === 0 ? 'pass' : 'warning',
        count: matchesWithoutPerformance.length,
        details: matchesWithoutPerformance.map(m => 
          `${new Date(m.match_date).toLocaleDateString()} ${m.venue ? `@ ${m.venue}` : ''}`
        ),
        icon: <Calendar className="w-5 h-5" />,
      },
      {
        id: 'matches_no_series',
        label: 'Unassigned Matches',
        description: 'Matches not linked to any series',
        status: matchesNoSeries.length === 0 ? 'pass' : matches.length === 0 ? 'pass' : 'warning',
        count: matchesNoSeries.length,
        details: matchesNoSeries.map(m => 
          `${new Date(m.match_date).toLocaleDateString()} ${m.venue ? `@ ${m.venue}` : ''}`
        ),
        icon: <Trophy className="w-5 h-5" />,
      },
      {
        id: 'data_anomalies',
        label: 'Data Anomalies',
        description: 'Unusual or potentially incorrect data entries',
        status: anomalies.length === 0 ? 'pass' : 'error',
        count: anomalies.length,
        details: anomalies,
        icon: <Activity className="w-5 h-5" />,
      },
    ]);

    setIsAnalyzing(false);
    setLastAnalysis(new Date());
  };

  useEffect(() => {
    runHealthChecks();
  }, [players.length, matches.length, series.length]);

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    switch (status) {
      case 'loading':
        return <Badge variant="outline">Checking...</Badge>;
      case 'pass':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">All Clear</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Needs Attention</Badge>;
      case 'error':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Issues Found</Badge>;
    }
  };

  const overallHealth = () => {
    const passCount = checks.filter(c => c.status === 'pass').length;
    const total = checks.length;
    if (total === 0) return 0;
    return Math.round((passCount / total) * 100);
  };

  const getOverallStatus = () => {
    if (checks.some(c => c.status === 'error')) return 'error';
    if (checks.some(c => c.status === 'warning')) return 'warning';
    if (checks.every(c => c.status === 'pass')) return 'pass';
    return 'loading';
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(getOverallStatus())}
              Data Health Score
            </CardTitle>
            <CardDescription>
              {lastAnalysis 
                ? `Last analyzed: ${lastAnalysis.toLocaleTimeString()}`
                : 'Running initial analysis...'
              }
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runHealthChecks}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Re-analyze
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Progress 
                value={overallHealth()} 
                className={`h-3 ${
                  getOverallStatus() === 'pass' ? '[&>div]:bg-emerald-500' :
                  getOverallStatus() === 'warning' ? '[&>div]:bg-amber-500' :
                  '[&>div]:bg-destructive'
                }`}
              />
            </div>
            <span className="text-2xl font-bold font-display">{overallHealth()}%</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{players.length}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{matches.length}</p>
              <p className="text-xs text-muted-foreground">Matches</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{series.length}</p>
              <p className="text-xs text-muted-foreground">Series</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">
                {checks.filter(c => c.status === 'pass').length}/{checks.length}
              </p>
              <p className="text-xs text-muted-foreground">Checks Passed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Health Checks</CardTitle>
          <CardDescription>Detailed breakdown of data quality checks</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Accordion type="multiple" className="w-full">
            {checks.map((check) => (
              <AccordionItem key={check.id} value={check.id} className="border-b last:border-b-0">
                <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-muted/50">
                      {check.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{check.label}</span>
                        {getStatusBadge(check.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{check.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      {check.status !== 'loading' && check.status !== 'pass' && (
                        <span className="text-sm font-medium">
                          {check.count} issue{check.count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  {check.status === 'pass' ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>No issues found</span>
                    </div>
                  ) : check.details.length === 0 ? (
                    <p className="text-muted-foreground">No additional details</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {check.count} item{check.count !== 1 ? 's' : ''} need{check.count === 1 ? 's' : ''} attention:
                      </p>
                      <ul className="grid gap-1 max-h-40 overflow-y-auto">
                        {check.details.slice(0, 20).map((detail, idx) => (
                          <li key={idx} className="text-sm flex items-center gap-2 text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                            {detail}
                          </li>
                        ))}
                        {check.details.length > 20 && (
                          <li className="text-sm text-muted-foreground italic">
                            ... and {check.details.length - 20} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};
