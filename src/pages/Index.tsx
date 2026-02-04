import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { TopPerformers } from '@/components/TopPerformers';
import { RankingsTable } from '@/components/RankingsTable';
import { RankingFilters } from '@/components/RankingFilters';
import { RankingSeasonFilter } from '@/components/RankingSeasonFilter';
import { HallOfFame } from '@/components/HallOfFame';
import { SeasonAwardsDisplay } from '@/components/SeasonAwardsDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlayerRankings } from '@/hooks/usePlayerRankings';
import { useBattingRankingsBySeason } from '@/hooks/useBattingRankingsBySeason';
import { useBowlingRankingsBySeason } from '@/hooks/useBowlingRankingsBySeason';
import { useFieldingRankingsBySeason } from '@/hooks/useFieldingRankingsBySeason';
import { useOverallRankingsBySeason } from '@/hooks/useOverallRankingsBySeason';
import { Loader2, Trophy, Target, Shield, Crown } from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';
const Index = () => {
  const [minMatches, setMinMatches] = useState(0);
  const [minOvers, setMinOvers] = useState(0);
  const [activeTab, setActiveTab] = useState('batting');
  const [selectedSeasonId, setSelectedSeasonId] = useState('all');
  
  const {
    loading,
    error,
    getBattingRankings,
    getBowlingRankings,
    getFieldingRankings,
    getOverallRankings
  } = usePlayerRankings();

  // Season-filtered rankings
  const { rankings: battingBySeasonRankings, loading: battingSeasonLoading } = useBattingRankingsBySeason(selectedSeasonId);
  const { rankings: bowlingBySeasonRankings, loading: bowlingSeasonLoading } = useBowlingRankingsBySeason(selectedSeasonId);
  const { rankings: fieldingBySeasonRankings, loading: fieldingSeasonLoading } = useFieldingRankingsBySeason(selectedSeasonId);
  const { rankings: overallBySeasonRankings, loading: overallSeasonLoading } = useOverallRankingsBySeason(selectedSeasonId);

  // Use season-filtered rankings if a season is selected, otherwise use the hook's filtered rankings
  const battingRankings = selectedSeasonId === 'all' ? getBattingRankings(minMatches) : battingBySeasonRankings;
  const bowlingRankings = selectedSeasonId === 'all' ? getBowlingRankings(minMatches, minOvers) : bowlingBySeasonRankings;
  const fieldingRankings = selectedSeasonId === 'all' ? getFieldingRankings(minMatches) : fieldingBySeasonRankings;
  
  // Map overall rankings to include 'rating' property for RankingsTable compatibility
  const overallRankings = selectedSeasonId === 'all' 
    ? getOverallRankings(minMatches) 
    : overallBySeasonRankings.map(player => ({
        ...player,
        rating: player.totalPoints,
        runs: player.stats?.total_runs,
        wickets: player.stats?.wickets,
        catches: player.stats?.catches,
      }));
  
  const isSeasonLoading = selectedSeasonId !== 'all' && (battingSeasonLoading || bowlingSeasonLoading || fieldingSeasonLoading || overallSeasonLoading);

  // Get unfiltered rankings for top performers
  const topBatting = getBattingRankings(0);
  const topBowling = getBowlingRankings(0, 0);
  const topFielding = getFieldingRankings(0);
  const tabConfig = [{
    value: 'batting',
    label: 'Batting',
    icon: Trophy,
    color: 'from-emerald-500 to-teal-600'
  }, {
    value: 'bowling',
    label: 'Bowling',
    icon: Target,
    color: 'from-red-500 to-rose-600'
  }, {
    value: 'fielding',
    label: 'Fielding',
    icon: Shield,
    color: 'from-blue-500 to-indigo-600'
  }, {
    value: 'overall',
    label: 'Overall',
    icon: Crown,
    color: 'from-amber-500 to-orange-600'
  }];
  return <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 md:py-12">
        {loading ? <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
            </div>
            <span className="text-muted-foreground font-medium">Loading rankings...</span>
          </div> : error ? <div className="text-center py-20">
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-8 max-w-md mx-auto">
              <p className="text-destructive font-medium">Error loading data</p>
              <p className="text-destructive/70 text-sm mt-2">{error}</p>
            </div>
          </div> : <>
            {/* Hero Section */}
            <motion.section initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5
        }} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 font-display tracking-wide bg-transparent text-transparent">
                <span className="text-gradient bg-transparent text-secondary">Top Performers</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Track the best players across batting, bowling, and fielding categories
              </p>
            </motion.section>

            {/* Top Performers Section */}
            <motion.section initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.1
        }} className="mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <TopPerformers title="Top Batsmen" icon="🏏" players={topBatting} statKey="runs" statLabel="Runs" gradient="from-emerald-500 to-teal-600" />
                <TopPerformers title="Top Bowlers" icon="🎯" players={topBowling} statKey="wickets" statLabel="Wickets" gradient="from-red-500 to-rose-600" />
                <TopPerformers title="Top Fielders" icon="🧤" players={topFielding} statKey="catches" statLabel="Catches" gradient="from-blue-500 to-indigo-600" />
              </div>
            </motion.section>

            {/* Hall of Fame & Season Awards */}
            <motion.section initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.15
        }} className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HallOfFame />
              <SeasonAwardsDisplay compact />
            </motion.section>

            {/* Rankings Tables */}
            <motion.section initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.2
        }}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start mb-6 bg-card border border-border shadow-md rounded-xl p-1.5 h-auto flex-wrap gap-1">
                  {tabConfig.map(tab => {
                const Icon = tab.icon;
                return <TabsTrigger key={tab.value} value={tab.value} className={`data-[state=active]:bg-gradient-to-r data-[state=active]:${tab.color} data-[state=active]:text-white data-[state=active]:shadow-lg px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition-all`}>
                        <Icon className="w-4 h-4 mr-2" />
                        {tab.label}
                      </TabsTrigger>;
              })}
                </TabsList>

                {/* Season Filter and Match Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Season:</span>
                    <RankingSeasonFilter 
                      selectedSeason={selectedSeasonId} 
                      onSeasonChange={setSelectedSeasonId} 
                    />
                  </div>
                  {selectedSeasonId === 'all' && (
                    <RankingFilters 
                      minMatches={minMatches} 
                      minOvers={minOvers} 
                      onMinMatchesChange={setMinMatches} 
                      onMinOversChange={setMinOvers} 
                      showOversFilter={activeTab === 'bowling'} 
                    />
                  )}
                </div>
                
                {isSeasonLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                <TabsContent value="batting">
                  <RankingsTable title="Batting Rankings" icon="🏏" category="batting" players={battingRankings} />
                </TabsContent>

                <TabsContent value="bowling">
                  <RankingsTable title="Bowling Rankings" icon="🎯" category="bowling" players={bowlingRankings} />
                </TabsContent>

                <TabsContent value="fielding">
                  <RankingsTable title="Fielding Rankings" icon="🧤" category="fielding" players={fieldingRankings} />
                </TabsContent>

                <TabsContent value="overall">
                  <RankingsTable title="Overall Rankings" icon="👑" category="overall" players={overallRankings} />
                </TabsContent>
              </Tabs>
            </motion.section>
          </>}
      </main>

      <SiteFooter />
    </div>;
};
export default Index;