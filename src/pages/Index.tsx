import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { TopPerformers } from '@/components/TopPerformers';
import { RankingsTable } from '@/components/RankingsTable';
import { RankingFilters } from '@/components/RankingFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlayerRankings } from '@/hooks/usePlayerRankings';
import { Loader2 } from 'lucide-react';
const Index = () => {
  const [minMatches, setMinMatches] = useState(0);
  const [minOvers, setMinOvers] = useState(0);
  const [activeTab, setActiveTab] = useState('batting');
  const {
    loading,
    error,
    getBattingRankings,
    getBowlingRankings,
    getFieldingRankings,
    getOverallRankings
  } = usePlayerRankings();
  const battingRankings = getBattingRankings(minMatches);
  const bowlingRankings = getBowlingRankings(minMatches, minOvers);
  const fieldingRankings = getFieldingRankings(minMatches);
  const overallRankings = getOverallRankings(minMatches);

  // Get unfiltered rankings for top performers
  const topBatting = getBattingRankings(0);
  const topBowling = getBowlingRankings(0, 0);
  const topFielding = getFieldingRankings(0);
  return <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 md:py-12">
        {loading ? <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading rankings...</span>
          </div> : error ? <div className="text-center py-20 text-destructive">
            Error loading data: {error}
          </div> : <>
            {/* Top Performers Section */}
            <motion.section initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          duration: 0.5
        }} className="mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-6 text-center font-serif">
                🏆 Top Performers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <TopPerformers title="Top Batsmen" icon="🏏" players={topBatting} statKey="runs" statLabel="Runs" gradient="from-emerald-500 to-teal-600" />
                <TopPerformers title="Top Bowlers" icon="🎯" players={topBowling} statKey="wickets" statLabel="Wickets" gradient="from-red-500 to-rose-600" />
                <TopPerformers title="Top Fielders" icon="🧤" players={topFielding} statKey="catches" statLabel="Catches" gradient="from-blue-500 to-indigo-600" />
              </div>
            </motion.section>

            {/* Rankings Tables */}
            <section>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start mb-6 bg-card border shadow-sm rounded-xl p-1 h-auto flex-wrap">
                  <TabsTrigger value="batting" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold">
                    🏏 Batting
                  </TabsTrigger>
                  <TabsTrigger value="bowling" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold">
                    🎯 Bowling
                  </TabsTrigger>
                  <TabsTrigger value="fielding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold">
                    🧤 Fielding
                  </TabsTrigger>
                  <TabsTrigger value="overall" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold">
                    👑 Overall
                  </TabsTrigger>
                </TabsList>

                {/* Filters */}
                <RankingFilters minMatches={minMatches} minOvers={minOvers} onMinMatchesChange={setMinMatches} onMinOversChange={setMinOvers} showOversFilter={activeTab === 'bowling'} />

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
            </section>
          </>}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6 mt-12">
        <div className="container text-center">
          <p className="text-muted-foreground">
            © 2025 Stellar Slayers Cricket Club. All rights reserved.
          </p>
        </div>
      </footer>
    </div>;
};
export default Index;