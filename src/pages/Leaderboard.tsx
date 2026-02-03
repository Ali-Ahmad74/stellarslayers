import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Minus, RefreshCw, Share2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RankBadge } from '@/components/RankBadge';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { RankingSeasonFilter } from '@/components/RankingSeasonFilter';
import { ExportButton } from '@/components/ExportButton';
import { usePlayerRankings } from '@/hooks/usePlayerRankings';
import { usePointHistory } from '@/hooks/usePointHistory';
import { useBowlingRankingsBySeason } from '@/hooks/useBowlingRankingsBySeason';
import { useBattingRankingsBySeason } from '@/hooks/useBattingRankingsBySeason';
import { useFieldingRankingsBySeason } from '@/hooks/useFieldingRankingsBySeason';
import { useOverallRankingsBySeason } from '@/hooks/useOverallRankingsBySeason';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTeamSettings } from '@/hooks/useTeamSettings';
import { useScoringSettings } from '@/hooks/useScoringSettings';
import { SharePlayerCardDialog } from '@/components/SharePlayerCardDialog';
import { SiteFooter } from '@/components/SiteFooter';
import { exportPlayerStats, type PlayerExportData } from '@/lib/pdf-export';

type SortKey = 'totalPoints' | 'battingPoints' | 'bowlingPoints' | 'fieldingPoints' | 'weeklyChange' | 'monthlyChange';
const Leaderboard = () => {
  const {
    players,
    loading,
    error
  } = usePlayerRankings();
  const {
    pointChanges,
    loading: historyLoading,
    recordCurrentPoints
  } = usePointHistory();
  const {
    isAdmin
  } = useAuth();
  const { teamSettings } = useTeamSettings();
  const { settings: scoringSettings } = useScoringSettings();

  const [sortKey, setSortKey] = useState<SortKey>('totalPoints');
  const [activeTab, setActiveTab] = useState('overall');
  const [isRecording, setIsRecording] = useState(false);
  const [sharePlayerId, setSharePlayerId] = useState<number | null>(null);

  // Season filter states for each category
  const [overallSeasonId, setOverallSeasonId] = useState<string>('all');
  const [battingSeasonId, setBattingSeasonId] = useState<string>('all');
  const [bowlingSeasonId, setBowlingSeasonId] = useState<string>('all');
  const [fieldingSeasonId, setFieldingSeasonId] = useState<string>('all');

  // Rankings with season filters
  const {
    rankings: overallRankings,
    loading: overallLoading
  } = useOverallRankingsBySeason(overallSeasonId);
  const {
    rankings: battingRankings,
    loading: battingLoading
  } = useBattingRankingsBySeason(battingSeasonId);
  const {
    rankings: bowlingRankings,
    loading: bowlingLoading
  } = useBowlingRankingsBySeason(bowlingSeasonId);
  const {
    rankings: fieldingRankings,
    loading: fieldingLoading
  } = useFieldingRankingsBySeason(fieldingSeasonId);

  // Record points on mount (for admins)
  const handleRecordPoints = async () => {
    setIsRecording(true);
    await recordCurrentPoints();
    setIsRecording(false);
  };

  const sharePlayer = players.find(p => p.id === sharePlayerId);

  const handleExportPlayers = () => {
    const exportData: PlayerExportData[] = players.map(p => {
      const s = p.stats;
      const sr = s && s.total_balls > 0 ? ((s.total_runs / s.total_balls) * 100).toFixed(2) : '0.00';
      const avg = s && s.times_out > 0 ? (s.total_runs / s.times_out).toFixed(2) : (s?.total_runs?.toFixed(2) || '0.00');
      const overs = s ? (s.bowling_balls / 6).toFixed(1) : '0.0';
      const eco = s && s.bowling_balls > 0 ? (s.runs_conceded / (s.bowling_balls / 6)).toFixed(2) : '0.00';
      return {
        name: p.name,
        role: p.role,
        matches: s?.matches || 0,
        runs: s?.total_runs || 0,
        balls_faced: s?.total_balls || 0,
        fours: s?.fours || 0,
        sixes: s?.sixes || 0,
        average: avg,
        strike_rate: sr,
        wickets: s?.wickets || 0,
        runs_conceded: s?.runs_conceded || 0,
        overs_bowled: overs,
        economy: eco,
        catches: s?.catches || 0,
        runouts: s?.runouts || 0,
        stumpings: s?.stumpings || 0,
      };
    });
    exportPlayerStats(exportData, { 
      teamName: teamSettings?.team_name, 
      logoUrl: teamSettings?.team_logo_url 
    });
  };
  const getLeaderboardData = () => {
    // For category tabs, return empty - we use season-filtered rankings instead
    if (activeTab === 'batting' || activeTab === 'bowling' || activeTab === 'fielding') {
      return [];
    }
    const playersWithPoints = players.filter(p => p.stats && (p.stats.total_runs > 0 || p.stats.total_balls > 0 || p.stats.bowling_balls > 0 || p.stats.wickets > 0 || p.stats.catches > 0 || p.stats.runouts > 0 || p.stats.stumpings > 0)).map(p => {
      const changes = pointChanges.get(p.id);
      return {
        ...p,
        points: p.iccPoints,
        weeklyChange: changes?.weeklyChange || 0,
        monthlyChange: changes?.monthlyChange || 0
      };
    });

    // Only overall tab uses this data now
    const sorted = playersWithPoints.sort((a, b) => {
      switch (sortKey) {
        case 'battingPoints':
          return b.points.battingPoints - a.points.battingPoints;
        case 'bowlingPoints':
          return b.points.bowlingPoints - a.points.bowlingPoints;
        case 'fieldingPoints':
          return b.points.fieldingPoints - a.points.fieldingPoints;
        case 'weeklyChange':
          return b.weeklyChange - a.weeklyChange;
        case 'monthlyChange':
          return b.monthlyChange - a.monthlyChange;
        default:
          return b.points.totalPoints - a.points.totalPoints;
      }
    });
    return sorted.map((p, index) => ({
      ...p,
      rank: index + 1
    }));
  };
  const leaderboardData = getLeaderboardData();

  // Get display data based on active tab
  const getDisplayData = () => {
    switch (activeTab) {
      case 'batting':
        return battingRankings;
      case 'bowling':
        return bowlingRankings;
      case 'fielding':
        return fieldingRankings;
      default:
        return overallSeasonId === 'all' ? leaderboardData : overallRankings;
    }
  };
  const displayData = getDisplayData();
  const isCategoryLoading = activeTab === 'overall' ? (overallSeasonId !== 'all' && overallLoading) : activeTab === 'batting' ? battingLoading : activeTab === 'bowling' ? bowlingLoading : activeTab === 'fielding' ? fieldingLoading : false;

  // Get top 3 for podium display (only show when no season filter on overall)
  const topThree = overallSeasonId === 'all' ? leaderboardData.slice(0, 3) : overallRankings.slice(0, 3);
  
  // Helper to get points for podium (works with both data types)
  const getPodiumPoints = (player: typeof topThree[0]) => {
    if ('points' in player) {
      return player.points.totalPoints;
    }
    return player.totalPoints;
  };
  const getTrendIcon = (change?: number) => {
    if (!change || change === 0) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };
  if (loading) {
    return <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading leaderboard...</span>
        </div>
      </div>;
  }
  if (error) {
    return <div className="min-h-screen bg-background">
        <Header />
        <div className="text-center py-20 text-destructive">
          Error loading data: {error}
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
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2">
               
               
               
               
               
               
               
               
               
               
               
               
              
              
              
              
              
              
              
              
              
              
              
             
            
           
          
         
        
       
      
     
    
   
  
 
🏆 Leaderboard Ranking
            
            
            
            
            
            
             
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
             
             
             
             
             
             
             
             
             
             
            </h1>
            <p className="text-muted-foreground">Complete rankings with points system</p>
            {isAdmin && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <ExportButton onExportPlayers={handleExportPlayers} disabled={loading || players.length === 0} />
                <Button variant="outline" size="sm" onClick={handleRecordPoints} disabled={isRecording}>
                  {isRecording ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Record Today's Points
                </Button>
              </div>
            )}
          </div>

          {/* Top 3 Podium */}
          {topThree.length >= 3 && activeTab === 'overall' && <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} className="mb-12">
              <div className="flex justify-center items-end gap-4 md:gap-8">
                {/* 2nd Place */}
                <div className="text-center">
                  <Link to={`/player/${topThree[1].id}`}>
                    <motion.div whileHover={{
                  scale: 1.05
                }} className="bg-gradient-to-t from-gray-300 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-xl p-4 pt-8 w-28 md:w-36 mx-[2px]">
                      <PlayerAvatar name={topThree[1].name} size="lg" />
                      <p className="font-bold mt-2 text-sm truncate">{topThree[1].name}</p>
                      <p className="text-2xl font-display font-bold text-gray-600 dark:text-gray-300">
                        {getPodiumPoints(topThree[1])}
                      </p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </motion.div>
                    <div className="bg-gray-400 text-white py-2 text-2xl font-bold">2</div>
                  </Link>
                </div>

                {/* 1st Place */}
                <div className="text-center">
                  <Link to={`/player/${topThree[0].id}`}>
                    <motion.div whileHover={{
                  scale: 1.05
                }} className="bg-gradient-to-t from-yellow-400 to-yellow-200 dark:from-yellow-600 dark:to-yellow-500 rounded-t-xl p-4 pt-10 w-32 md:w-44 my-0 px-[9px] mx-px">
                      <div className="text-4xl mb-2">👑</div>
                      <PlayerAvatar name={topThree[0].name} size="xl" />
                      <p className="font-bold mt-2 truncate">{topThree[0].name}</p>
                      <p className="text-3xl font-display font-bold text-yellow-700 dark:text-yellow-200">
                        {getPodiumPoints(topThree[0])}
                      </p>
                      <p className="text-xs text-yellow-700/70 dark:text-yellow-200/70">pts</p>
                    </motion.div>
                    <div className="bg-yellow-500 text-white py-3 text-3xl font-bold">1</div>
                  </Link>
                </div>

                {/* 3rd Place */}
                <div className="text-center">
                  <Link to={`/player/${topThree[2].id}`}>
                    <motion.div whileHover={{
                  scale: 1.05
                }} className="bg-gradient-to-t from-orange-300 to-orange-100 dark:from-orange-700 dark:to-orange-600 rounded-t-xl p-4 pt-6 w-24 md:w-32 mx-0 my-0">
                      <PlayerAvatar name={topThree[2].name} size="md" />
                      <p className="font-bold mt-2 text-sm truncate">{topThree[2].name}</p>
                      <p className="text-xl font-display font-bold text-orange-700 dark:text-orange-200">
                        {getPodiumPoints(topThree[2])}
                      </p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </motion.div>
                    <div className="bg-orange-500 text-white py-2 text-xl font-bold">3</div>
                  </Link>
                </div>
              </div>
            </motion.div>}

          {/* Category Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start mb-6 bg-card border shadow-sm rounded-xl p-1 h-auto flex-wrap">
              <TabsTrigger value="overall" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold">
                👑 Overall
              </TabsTrigger>
              <TabsTrigger value="batting" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold">
                🏏 Batting
              </TabsTrigger>
              <TabsTrigger value="bowling" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold">
                🎯 Bowling
              </TabsTrigger>
              <TabsTrigger value="fielding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold">
                🧤 Fielding
              </TabsTrigger>
            </TabsList>

            {/* Season filter and sorting options for overall tab */}
            {activeTab === 'overall' && <div className="space-y-4 mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Filter by Season:</span>
                  <RankingSeasonFilter selectedSeason={overallSeasonId} onSeasonChange={setOverallSeasonId} />
                </div>
                {overallSeasonId === 'all' && <div className="flex gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground self-center">Sort by:</span>
                  {[{
                    key: 'totalPoints',
                    label: 'Total'
                  }, {
                    key: 'battingPoints',
                    label: 'Batting'
                  }, {
                    key: 'bowlingPoints',
                    label: 'Bowling'
                  }, {
                    key: 'fieldingPoints',
                    label: 'Fielding'
                  }, {
                    key: 'weeklyChange',
                    label: '📈 Weekly'
                  }, {
                    key: 'monthlyChange',
                    label: '📊 Monthly'
                  }].map(({
                    key,
                    label
                  }) => <Button key={key} variant={sortKey === key ? 'default' : 'outline'} size="sm" onClick={() => setSortKey(key as SortKey)}>
                        {label}
                      </Button>)}
                </div>}
              </div>}

            {/* Season filter for category tabs */}
            {activeTab === 'batting' && <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-muted-foreground">Filter by Season:</span>
                <RankingSeasonFilter selectedSeason={battingSeasonId} onSeasonChange={setBattingSeasonId} />
              </div>}

            {activeTab === 'bowling' && <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-muted-foreground">Filter by Season:</span>
                <RankingSeasonFilter selectedSeason={bowlingSeasonId} onSeasonChange={setBowlingSeasonId} />
              </div>}

            {activeTab === 'fielding' && <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-muted-foreground">Filter by Season:</span>
                <RankingSeasonFilter selectedSeason={fieldingSeasonId} onSeasonChange={setFieldingSeasonId} />
              </div>}

            {/* Leaderboard Table */}
            <Card variant="elevated" className="overflow-hidden">
              <CardHeader className="gradient-header text-white py-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Trophy className="w-8 h-8" />
                  {activeTab === 'overall' ? 'Overall Leaderboard' : activeTab === 'batting' ? 'Batting Leaderboard' : activeTab === 'bowling' ? 'Bowling Leaderboard' : 'Fielding Leaderboard'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-16 text-center font-semibold">Rank</TableHead>
                        <TableHead className="font-semibold">Player</TableHead>
                        <TableHead className="text-center font-semibold">Matches</TableHead>
                        {activeTab === 'overall' ? <>
                            <TableHead className="text-center font-semibold">Bat Pts</TableHead>
                            <TableHead className="text-center font-semibold">Bowl Pts</TableHead>
                            <TableHead className="text-center font-semibold">Field Pts</TableHead>
                            <TableHead className="text-center font-semibold text-primary">Total Pts</TableHead>
                            {overallSeasonId === 'all' && <>
                              <TableHead className="text-center font-semibold">
                                <div className="flex items-center justify-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  Week
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold">
                                <div className="flex items-center justify-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  Month
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-semibold w-16">Share</TableHead>
                            </>}
                          </> : activeTab === 'batting' ? <>
                            <TableHead className="text-center font-semibold">Runs</TableHead>
                            <TableHead className="text-center font-semibold">SR</TableHead>
                            <TableHead className="text-center font-semibold">4s</TableHead>
                            <TableHead className="text-center font-semibold">6s</TableHead>
                            <TableHead className="text-center font-semibold text-primary">Points</TableHead>
                          </> : activeTab === 'bowling' ? <>
                            <TableHead className="text-center font-semibold">Wkts</TableHead>
                            <TableHead className="text-center font-semibold">Econ</TableHead>
                            <TableHead className="text-center font-semibold">Maidens</TableHead>
                            <TableHead className="text-center font-semibold text-primary">Points</TableHead>
                          </> : <>
                            <TableHead className="text-center font-semibold">Catches</TableHead>
                            <TableHead className="text-center font-semibold">Run Outs</TableHead>
                            <TableHead className="text-center font-semibold">Stumpings</TableHead>
                            <TableHead className="text-center font-semibold text-primary">Points</TableHead>
                          </>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isCategoryLoading ? <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <div className="flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                              <span className="text-muted-foreground">Loading rankings...</span>
                            </div>
                          </TableCell>
                        </TableRow> : displayData.length === 0 ? <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            No data available yet.
                          </TableCell>
                        </TableRow> : activeTab === 'batting' ?
                    // Batting rankings from season filter
                    battingRankings.map((player, index) => <motion.tr key={player.id} initial={{
                      opacity: 0,
                      x: -20
                    }} animate={{
                      opacity: 1,
                      x: 0
                    }} transition={{
                      duration: 0.3,
                      delay: index * 0.03
                    }} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/player/${player.id}`}>
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <RankBadge rank={player.rank} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link to={`/player/${player.id}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                                <PlayerAvatar name={player.name} size="sm" />
                                <span className="font-semibold">{player.name}</span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-center">{player.matches || 0}</TableCell>
                            <TableCell className="text-center">{player.runs || 0}</TableCell>
                            <TableCell className="text-center">{player.strikeRate?.toFixed(1) || '0.0'}</TableCell>
                            <TableCell className="text-center">—</TableCell>
                            <TableCell className="text-center">—</TableCell>
                            <TableCell className="text-center font-bold text-primary text-lg">
                              {player.rating}
                            </TableCell>
                          </motion.tr>) : activeTab === 'bowling' ?
                    // Bowling rankings from season filter
                    bowlingRankings.map((player, index) => <motion.tr key={player.id} initial={{
                      opacity: 0,
                      x: -20
                    }} animate={{
                      opacity: 1,
                      x: 0
                    }} transition={{
                      duration: 0.3,
                      delay: index * 0.03
                    }} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/player/${player.id}`}>
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <RankBadge rank={player.rank} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link to={`/player/${player.id}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                                <PlayerAvatar name={player.name} size="sm" />
                                <span className="font-semibold">{player.name}</span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-center">{player.matches || 0}</TableCell>
                            <TableCell className="text-center">{player.wickets || 0}</TableCell>
                            <TableCell className="text-center">{player.economy?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell className="text-center">—</TableCell>
                            <TableCell className="text-center font-bold text-primary text-lg">
                              {player.rating}
                            </TableCell>
                          </motion.tr>) : activeTab === 'fielding' ?
                    // Fielding rankings from season filter
                    fieldingRankings.map((player, index) => <motion.tr key={player.id} initial={{
                      opacity: 0,
                      x: -20
                    }} animate={{
                      opacity: 1,
                      x: 0
                    }} transition={{
                      duration: 0.3,
                      delay: index * 0.03
                    }} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/player/${player.id}`}>
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <RankBadge rank={player.rank} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link to={`/player/${player.id}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                                <PlayerAvatar name={player.name} size="sm" />
                                <span className="font-semibold">{player.name}</span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-center">{player.matches || 0}</TableCell>
                            <TableCell className="text-center">{player.catches || 0}</TableCell>
                            <TableCell className="text-center">{player.runouts || 0}</TableCell>
                            <TableCell className="text-center">{player.stumpings || 0}</TableCell>
                            <TableCell className="text-center font-bold text-primary text-lg">
                              {player.rating}
                            </TableCell>
                          </motion.tr>) :
                    // Overall tab - show season-filtered or all-time data
                    overallSeasonId !== 'all' ?
                    // Season-filtered overall rankings
                    overallRankings.map((player, index) => <motion.tr key={player.id} initial={{
                      opacity: 0,
                      x: -20
                    }} animate={{
                      opacity: 1,
                      x: 0
                    }} transition={{
                      duration: 0.3,
                      delay: index * 0.03
                    }} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/player/${player.id}`}>
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <RankBadge rank={player.rank} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link to={`/player/${player.id}`} className="flex items-center gap-3 hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                                <PlayerAvatar name={player.name} size="sm" />
                                <span className="font-semibold">{player.name}</span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-center">{player.matches || 0}</TableCell>
                            <TableCell className="text-center">{player.battingPoints}</TableCell>
                            <TableCell className="text-center">{player.bowlingPoints}</TableCell>
                            <TableCell className="text-center">{player.fieldingPoints}</TableCell>
                            <TableCell className="text-center font-bold text-primary text-lg">
                              {player.totalPoints}
                            </TableCell>
                          </motion.tr>) :
                    // All-time overall rankings with weekly/monthly changes
                    leaderboardData.map((player, index) => <motion.tr key={player.id} initial={{
                      opacity: 0,
                      x: -20
                    }} animate={{
                      opacity: 1,
                      x: 0
                    }} transition={{
                      duration: 0.3,
                      delay: index * 0.03
                    }} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <RankBadge rank={player.rank} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link to={`/player/${player.id}`} className="flex items-center gap-3 hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                                <PlayerAvatar name={player.name} size="sm" />
                                <span className="font-semibold">{player.name}</span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-center">{player.stats?.matches || 0}</TableCell>
                            <TableCell className="text-center">{player.points.battingPoints}</TableCell>
                            <TableCell className="text-center">{player.points.bowlingPoints}</TableCell>
                            <TableCell className="text-center">{player.points.fieldingPoints}</TableCell>
                            <TableCell className="text-center font-bold text-primary text-lg">
                              {player.points.totalPoints}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getTrendIcon(player.weeklyChange)}
                                <span className={player.weeklyChange > 0 ? 'text-emerald-500 font-medium' : player.weeklyChange < 0 ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                                  {player.weeklyChange > 0 ? '+' : ''}{player.weeklyChange}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getTrendIcon(player.monthlyChange)}
                                <span className={player.monthlyChange > 0 ? 'text-emerald-500 font-medium' : player.monthlyChange < 0 ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                                  {player.monthlyChange > 0 ? '+' : ''}{player.monthlyChange}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSharePlayerId(player.id);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </motion.tr>)}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </Tabs>

          {/* Points Legend */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">📊 ICC-Style Points System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-emerald-600 mb-2">🏏 Batting</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 1 point per run</li>
                    <li>• +2 per four</li>
                    <li>• +3 per six</li>
                    <li>• +5 for 30+ score</li>
                    <li>• +10 for 50+ score</li>
                    <li>• +20 for 100+ score</li>
                    <li>• Strike rate bonus</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">🎯 Bowling</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• +10 per wicket</li>
                    <li>• +5 per maiden</li>
                    <li>• +5 for 3-fer</li>
                    <li>• +10 for 5-fer</li>
                    <li>• Economy bonus</li>
                    <li>• -1 per no-ball</li>
                    <li>• -1 per wide</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">🧤 Fielding</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• +5 per catch</li>
                    <li>• +7 per run-out</li>
                    <li>• +7 per stumping</li>
                    <li>• -5 per dropped catch</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <SiteFooter />

      {sharePlayer && (
        <SharePlayerCardDialog
          open={!!sharePlayerId}
          onOpenChange={(open) => !open && setSharePlayerId(null)}
          player={{
            id: sharePlayer.id,
            name: sharePlayer.name,
            role: sharePlayer.role,
            photo_url: sharePlayer.photo_url,
            stats: sharePlayer.stats,
          }}
          teamName={teamSettings?.team_name}
          teamSettings={teamSettings}
          scoringSettings={scoringSettings}
        />
      )}
    </div>;
};
export default Leaderboard;