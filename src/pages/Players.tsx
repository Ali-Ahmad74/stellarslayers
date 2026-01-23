import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { RoleBadge } from '@/components/RoleBadge';
import { usePlayerRankings } from '@/hooks/usePlayerRankings';
import { useActiveSeries } from '@/hooks/useActiveSeries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Players = () => {
  const [search, setSearch] = useState('');
  const { activeSeries } = useActiveSeries();
  const [activeOnly, setActiveOnly] = useState(false);
  const { players, loading } = usePlayerRankings(activeOnly ? activeSeries?.id : null);

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              👥 All Players
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredPlayers.length} players in the squad
            </p>
            {activeSeries && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant={activeOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveOnly((v) => !v)}
                >
                  Active series only
                </Button>
                {activeOnly && <Badge variant="secondary">{activeSeries.name}</Badge>}
              </div>
            )}
          </div>
          
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link to={`/player/${player.id}`}>
                  <Card variant="elevated" className="overflow-hidden group cursor-pointer">
                    <div className="gradient-header p-6 text-white text-center">
                      <PlayerAvatar 
                        name={player.name} 
                        photoUrl={player.photo_url} 
                        size="lg"
                        className="mx-auto mb-4 ring-4 ring-white/30 group-hover:ring-white/50 transition-all"
                      />
                      <h3 className="font-display text-xl font-bold group-hover:scale-105 transition-transform">
                        {player.name}
                      </h3>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <RoleBadge role={player.role} />
                        <span className="text-sm text-muted-foreground">
                          {player.stats?.matches || 0} matches
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-center text-sm">
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="font-bold text-primary">{Math.round(player.iccPoints?.totalPoints || 0)}</p>
                          <p className="text-xs text-muted-foreground">Points</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="font-bold text-primary">{player.stats?.total_runs || 0}</p>
                          <p className="text-xs text-muted-foreground">Runs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredPlayers.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">
              {search ? `No players found matching "${search}"` : 'No players added yet'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Players;
