import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { RoleBadge } from '@/components/RoleBadge';
import { PlayerAchievements } from '@/components/PlayerAchievements';
import { FormAnalysisChart } from '@/components/FormAnalysisChart';
import { PlayerSeasonFilter } from '@/components/PlayerSeasonFilter';
import { supabase } from '@/integrations/supabase/client';
import { calculateICCPoints, PlayerStats as PlayerStatsType } from '@/hooks/usePlayerRankings';
import { usePlayerSeasons } from '@/hooks/usePlayerSeasons';
import { usePlayerStatsBySeason } from '@/hooks/usePlayerStatsBySeason';
import { useFormAnalysis } from '@/hooks/useFormAnalysis';
import type { PlayerRole } from '@/types/cricket';
import { useScoringSettings } from '@/hooks/useScoringSettings';
import { useTeamSettings } from '@/hooks/useTeamSettings';
import { SharePlayerCardDialog } from '@/components/SharePlayerCardDialog';

interface Player {
  id: number;
  name: string;
  role: PlayerRole;
  photo_url: string | null;
  batting_style: string | null;
  bowling_style: string | null;
}

const PlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('all');
  const [seasonInitialized, setSeasonInitialized] = useState(false);
  const { settings: scoringSettings } = useScoringSettings();
  const { teamSettings } = useTeamSettings();
  const [shareOpen, setShareOpen] = useState(false);

  const playerId = id ? Number(id) : null;
  
  // Fetch available seasons for this player
  const { 
    seasons, 
    loading: seasonsLoading, 
    latestSeasonId 
  } = usePlayerSeasons(playerId);

  // Set default season to latest when loaded
  useEffect(() => {
    if (!seasonsLoading && !seasonInitialized && latestSeasonId) {
      setSelectedSeasonId(latestSeasonId);
      setSeasonInitialized(true);
    }
  }, [seasonsLoading, latestSeasonId, seasonInitialized]);

  // Fetch stats filtered by season
  const { 
    stats, 
    battingRecords, 
    bowlingRecords, 
    loading: statsLoading 
  } = usePlayerStatsBySeason(playerId, selectedSeasonId);
  
  const { formData, stats: formStats } = useFormAnalysis(battingRecords, bowlingRecords);

  // Fetch player basic info (only once)
  useEffect(() => {
    const fetchPlayer = async () => {
      if (!id) return;
      
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', Number(id))
        .maybeSingle();

      if (playerData) {
        setPlayer({
          ...playerData,
          role: playerData.role as PlayerRole,
        });
      }
      setPlayerLoading(false);
    };

    fetchPlayer();
  }, [id]);

  const loading = playerLoading || seasonsLoading;

  // Get selected season name for display
  const selectedSeasonName = selectedSeasonId === 'all' 
    ? 'All Seasons' 
    : seasons.find(s => String(s.id) === selectedSeasonId)?.name || '';

  if (loading && playerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Player Not Found</h1>
          <Link to="/">
            <Button>Return to Rankings</Button>
          </Link>
        </div>
      </div>
    );
  }

  const iccPoints = calculateICCPoints(stats, scoringSettings);

  // Calculate derived stats
  const strikeRate = stats && stats.total_balls > 0 
    ? ((stats.total_runs / stats.total_balls) * 100).toFixed(2) 
    : '0.00';
  
  const battingAverage = stats && stats.times_out > 0 
    ? (stats.total_runs / stats.times_out).toFixed(2) 
    : stats?.total_runs?.toFixed(2) || '0.00';

  const economy = stats && stats.bowling_balls > 0 
    ? (stats.runs_conceded / (stats.bowling_balls / 6)).toFixed(2) 
    : '0.00';

  const bowlingAverage = stats && stats.wickets > 0
    ? (stats.runs_conceded / stats.wickets).toFixed(2)
    : '0.00';

  const hasStats = stats && (
    stats.matches > 0 || 
    stats.total_runs > 0 || 
    stats.wickets > 0 || 
    stats.catches > 0
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        {/* Back Button + Season Filter */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Rankings
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Season:</span>
              <PlayerSeasonFilter 
                seasons={seasons}
                selectedSeasonId={selectedSeasonId}
                onSeasonChange={setSelectedSeasonId}
                loading={seasonsLoading}
              />
            </div>
            <Button onClick={() => setShareOpen(true)}>
              Share Player Card
            </Button>
          </div>
        </div>

        {/* Player Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-header rounded-2xl p-8 mb-8 text-white shadow-lg"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
            <PlayerAvatar name={player.name} photoUrl={player.photo_url} size="xl" />
            <div className="text-center md:text-left">
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">
                {player.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                <RoleBadge role={player.role} />
                {player.batting_style && (
                  <span className="text-white/80 text-sm">{player.batting_style}</span>
                )}
                {player.bowling_style && (
                  <span className="text-white/80 text-sm">• {player.bowling_style}</span>
                )}
              </div>
              <p className="text-white/70">
                {stats?.matches || 0} Matches {selectedSeasonId !== 'all' ? `in ${selectedSeasonName}` : 'Played'}
              </p>
            </div>
          </div>

          {/* ICC Points Cards in Header */}
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/70" />
              <span className="ml-2 text-white/70">Loading stats...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '🏏', label: 'Batting', value: iccPoints.battingPoints, color: 'bg-emerald-500/20' },
                { icon: '🎯', label: 'Bowling', value: iccPoints.bowlingPoints, color: 'bg-red-500/20' },
                { icon: '🧤', label: 'Fielding', value: iccPoints.fieldingPoints, color: 'bg-blue-500/20' },
                { icon: '👑', label: 'Total', value: iccPoints.totalPoints, color: 'bg-yellow-500/20' },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={`${item.color} backdrop-blur-sm rounded-xl p-4 text-center`}
                >
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <p className="text-3xl font-bold font-display">{item.value}</p>
                  <p className="text-sm text-white/70">{item.label} Points</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Empty State */}
        {!hasStats && !statsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 mb-8"
          >
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">No Stats Available</h3>
            <p className="text-muted-foreground">
              {selectedSeasonId !== 'all' 
                ? `No performance records found for ${selectedSeasonName}. Try selecting a different season.`
                : 'No performance records found for this player yet.'}
            </p>
          </motion.div>
        )}

        {/* Stats Sections */}
        {hasStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Batting Stats */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card variant="elevated">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🏏</span>
                    Batting Statistics
                    {selectedSeasonId !== 'all' && (
                      <span className="ml-auto text-sm font-normal bg-white/20 px-2 py-1 rounded">
                        {selectedSeasonName}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.total_runs || 0}</p>
                      <p className="text-sm text-muted-foreground">Runs</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.total_balls || 0}</p>
                      <p className="text-sm text-muted-foreground">Balls Faced</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{strikeRate}</p>
                      <p className="text-sm text-muted-foreground">Strike Rate</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{battingAverage}</p>
                      <p className="text-sm text-muted-foreground">Average</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.fours || 0}</p>
                      <p className="text-sm text-muted-foreground">Fours</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.sixes || 0}</p>
                      <p className="text-sm text-muted-foreground">Sixes</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.times_out || 0}</p>
                      <p className="text-sm text-muted-foreground">Dismissals</p>
                    </div>
                  </div>
                  {/* Milestones */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Milestones</h4>
                    <div className="flex gap-4">
                      <div className="text-center flex-1 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats?.thirties || 0}</p>
                        <p className="text-xs text-muted-foreground">30s</p>
                      </div>
                      <div className="text-center flex-1 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.fifties || 0}</p>
                        <p className="text-xs text-muted-foreground">50s</p>
                      </div>
                      <div className="text-center flex-1 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats?.hundreds || 0}</p>
                        <p className="text-xs text-muted-foreground">100s</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bowling Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card variant="elevated">
                <CardHeader className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🎯</span>
                    Bowling Statistics
                    {selectedSeasonId !== 'all' && (
                      <span className="ml-auto text-sm font-normal bg-white/20 px-2 py-1 rounded">
                        {selectedSeasonName}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.wickets || 0}</p>
                      <p className="text-sm text-muted-foreground">Wickets</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{bowlingAverage}</p>
                      <p className="text-sm text-muted-foreground">Average</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{economy}</p>
                      <p className="text-sm text-muted-foreground">Economy</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.runs_conceded || 0}</p>
                      <p className="text-sm text-muted-foreground">Runs Conceded</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.maidens || 0}</p>
                      <p className="text-sm text-muted-foreground">Maidens</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.wides || 0}/{stats?.no_balls || 0}</p>
                      <p className="text-sm text-muted-foreground">Wd/Nb</p>
                    </div>
                  </div>
                  {/* Bowling extras */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Additional Stats</h4>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="text-center p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats?.dot_balls || 0}</p>
                        <p className="text-xs text-muted-foreground">Dot Balls</p>
                      </div>
                      <div className="text-center p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats?.three_fers || 0}</p>
                        <p className="text-xs text-muted-foreground">3-fers</p>
                      </div>
                      <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats?.five_fers || 0}</p>
                        <p className="text-xs text-muted-foreground">5-fers</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <p className="text-lg font-bold">{stats?.fours_conceded || 0}</p>
                        <p className="text-xs text-muted-foreground">4s Given</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <p className="text-lg font-bold">{stats?.sixes_conceded || 0}</p>
                        <p className="text-xs text-muted-foreground">6s Given</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Fielding Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2"
            >
              <Card variant="elevated">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🧤</span>
                    Fielding Statistics
                    {selectedSeasonId !== 'all' && (
                      <span className="ml-auto text-sm font-normal bg-white/20 px-2 py-1 rounded">
                        {selectedSeasonName}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.catches || 0}</p>
                      <p className="text-sm text-muted-foreground">Catches</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.runouts || 0}</p>
                      <p className="text-sm text-muted-foreground">Run Outs</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-bold font-display text-primary">{stats?.stumpings || 0}</p>
                      <p className="text-sm text-muted-foreground">Stumpings</p>
                    </div>
                    <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-xl">
                      <p className="text-3xl font-bold font-display text-red-600 dark:text-red-400">{stats?.dropped_catches || 0}</p>
                      <p className="text-sm text-muted-foreground">Dropped</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <PlayerAchievements stats={stats || {}} />
            </motion.div>

            {/* Form Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <FormAnalysisChart data={formData} stats={formStats} type="batting" />
            </motion.div>
          </div>
        )}
      </main>

      {player && (
        <SharePlayerCardDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          player={{ ...player, stats }}
          teamName={teamSettings?.team_name}
          teamSettings={teamSettings}
          scoringSettings={scoringSettings}
        />
      )}
    </div>
  );
};

export default PlayerProfile;
