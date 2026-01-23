import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, X, Plus, Trophy } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { usePlayerRankings, PlayerWithStats } from '@/hooks/usePlayerRankings';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2 } from 'lucide-react';

const Compare = () => {
  const { players, loading, error } = usePlayerRankings();
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerWithStats[]>([]);
  const [openPopover, setOpenPopover] = useState<number | null>(null);

  const addPlayer = (player: PlayerWithStats, slotIndex: number) => {
    const newSelected = [...selectedPlayers];
    if (slotIndex < newSelected.length) {
      newSelected[slotIndex] = player;
    } else {
      newSelected.push(player);
    }
    setSelectedPlayers(newSelected);
    setOpenPopover(null);
  };

  const removePlayer = (index: number) => {
    setSelectedPlayers(selectedPlayers.filter((_, i) => i !== index));
  };

  const availablePlayers = players.filter(
    (p) => !selectedPlayers.find((sp) => sp.id === p.id)
  );

  const getStatValue = (player: PlayerWithStats, stat: string): string | number => {
    if (!player.stats) return '-';
    
    switch (stat) {
      case 'matches': return player.stats.matches;
      case 'runs': return player.stats.total_runs;
      case 'balls': return player.stats.total_balls;
      case 'fours': return player.stats.fours;
      case 'sixes': return player.stats.sixes;
      case 'sr': 
        return player.stats.total_balls > 0 
          ? ((player.stats.total_runs / player.stats.total_balls) * 100).toFixed(1)
          : '-';
      case 'avg':
        return player.stats.times_out > 0
          ? (player.stats.total_runs / player.stats.times_out).toFixed(1)
          : player.stats.total_runs > 0 ? 'N/A' : '-';
      case 'thirties': return player.stats.thirties;
      case 'fifties': return player.stats.fifties;
      case 'hundreds': return player.stats.hundreds;
      case 'wickets': return player.stats.wickets;
      case 'bowlingBalls': return player.stats.bowling_balls;
      case 'runsConceded': return player.stats.runs_conceded;
      case 'economy':
        return player.stats.bowling_balls > 0
          ? (player.stats.runs_conceded / (player.stats.bowling_balls / 6)).toFixed(2)
          : '-';
      case 'bowlingAvg':
        return player.stats.wickets > 0
          ? (player.stats.runs_conceded / player.stats.wickets).toFixed(1)
          : '-';
      case 'maidens': return player.stats.maidens;
      case 'wides': return player.stats.wides;
      case 'noBalls': return player.stats.no_balls;
      case 'threeFers': return player.stats.three_fers;
      case 'fiveFers': return player.stats.five_fers;
      case 'catches': return player.stats.catches;
      case 'runouts': return player.stats.runouts;
      case 'stumpings': return player.stats.stumpings;
      case 'droppedCatches': return player.stats.dropped_catches;
      case 'battingPts': return player.iccPoints.battingPoints;
      case 'bowlingPts': return player.iccPoints.bowlingPoints;
      case 'fieldingPts': return player.iccPoints.fieldingPoints;
      case 'totalPts': return player.iccPoints.totalPoints;
      default: return '-';
    }
  };

  const getBestValue = (stat: string): number | null => {
    if (selectedPlayers.length < 2) return null;
    
    const values = selectedPlayers.map(p => {
      const val = getStatValue(p, stat);
      return typeof val === 'number' ? val : parseFloat(val) || 0;
    });
    
    // For economy, avg, wides, noBalls, droppedCatches - lower is better
    const lowerIsBetter = ['economy', 'bowlingAvg', 'wides', 'noBalls', 'droppedCatches'];
    if (lowerIsBetter.includes(stat)) {
      const validValues = values.filter(v => v > 0);
      return validValues.length > 0 ? Math.min(...validValues) : null;
    }
    
    return Math.max(...values);
  };

  const isHighlighted = (player: PlayerWithStats, stat: string): boolean => {
    const bestValue = getBestValue(stat);
    if (bestValue === null) return false;
    
    const value = getStatValue(player, stat);
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    
    const lowerIsBetter = ['economy', 'bowlingAvg', 'wides', 'noBalls', 'droppedCatches'];
    if (lowerIsBetter.includes(stat)) {
      return numValue === bestValue && numValue > 0;
    }
    
    return numValue === bestValue && numValue > 0;
  };

  const StatRow = ({ label, stat, icon }: { label: string; stat: string; icon?: React.ReactNode }) => (
    <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedPlayers.length}, 1fr)` }}>
      <div className="flex items-center gap-2 text-muted-foreground font-medium py-3 border-b border-border">
        {icon}
        {label}
      </div>
      {selectedPlayers.map((player) => (
        <div
          key={player.id}
          className={`text-center py-3 border-b border-border font-semibold ${
            isHighlighted(player, stat) ? 'text-primary bg-primary/10 rounded' : ''
          }`}
        >
          {getStatValue(player, stat)}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading players...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="text-center py-20 text-destructive">
          Error loading data: {error}
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
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2">
              ⚔️ Player Comparison
            </h1>
            <p className="text-muted-foreground">
              Compare stats and ICC points between players side by side
            </p>
          </div>

          {/* Player Selection */}
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="w-5 h-5" />
                Select Players to Compare (2-4)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {[0, 1, 2, 3].map((slotIndex) => {
                  const player = selectedPlayers[slotIndex];
                  
                  if (player) {
                    return (
                      <motion.div
                        key={slotIndex}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative"
                      >
                        <div className="flex items-center gap-3 bg-card border rounded-xl p-4 pr-10 shadow-sm">
                          <PlayerAvatar name={player.name} size="md" />
                          <div>
                            <p className="font-semibold">{player.name}</p>
                            <p className="text-sm text-muted-foreground">{player.role}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => removePlayer(slotIndex)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  }
                  
                  if (slotIndex <= selectedPlayers.length) {
                    return (
                      <Popover key={slotIndex} open={openPopover === slotIndex} onOpenChange={(open) => setOpenPopover(open ? slotIndex : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-20 w-48 border-dashed">
                            <Plus className="w-5 h-5 mr-2" />
                            Add Player
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search players..." />
                            <CommandList>
                              <CommandEmpty>No players found.</CommandEmpty>
                              <CommandGroup>
                                {availablePlayers.map((player) => (
                                  <CommandItem
                                    key={player.id}
                                    onSelect={() => addPlayer(player, slotIndex)}
                                    className="flex items-center gap-3 cursor-pointer"
                                  >
                                    <PlayerAvatar name={player.name} size="sm" />
                                    <div>
                                      <p className="font-medium">{player.name}</p>
                                      <p className="text-xs text-muted-foreground">{player.role}</p>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  }
                  
                  return null;
                })}
              </div>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          {selectedPlayers.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* ICC Points */}
              <Card variant="elevated">
                <CardHeader className="gradient-header text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    ICC Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 overflow-x-auto">
                  <div className="min-w-[500px]">
                    {/* Player Headers */}
                    <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${selectedPlayers.length}, 1fr)` }}>
                      <div />
                      {selectedPlayers.map((player) => (
                        <div key={player.id} className="text-center">
                          <PlayerAvatar name={player.name} size="lg" className="mx-auto" />
                          <p className="font-bold mt-2">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.role}</p>
                        </div>
                      ))}
                    </div>
                    
                    <StatRow label="🏏 Batting Points" stat="battingPts" />
                    <StatRow label="🎯 Bowling Points" stat="bowlingPts" />
                    <StatRow label="🧤 Fielding Points" stat="fieldingPts" />
                    <StatRow label="🏆 Total Points" stat="totalPts" />
                  </div>
                </CardContent>
              </Card>

              {/* Batting Stats */}
              <Card variant="elevated">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    🏏 Batting Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 overflow-x-auto">
                  <div className="min-w-[500px]">
                    <StatRow label="Matches" stat="matches" />
                    <StatRow label="Runs" stat="runs" />
                    <StatRow label="Balls Faced" stat="balls" />
                    <StatRow label="Strike Rate" stat="sr" />
                    <StatRow label="Average" stat="avg" />
                    <StatRow label="Fours" stat="fours" />
                    <StatRow label="Sixes" stat="sixes" />
                    <StatRow label="30s" stat="thirties" />
                    <StatRow label="50s" stat="fifties" />
                    <StatRow label="100s" stat="hundreds" />
                  </div>
                </CardContent>
              </Card>

              {/* Bowling Stats */}
              <Card variant="elevated">
                <CardHeader className="bg-gradient-to-r from-red-600 to-red-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    🎯 Bowling Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 overflow-x-auto">
                  <div className="min-w-[500px]">
                    <StatRow label="Wickets" stat="wickets" />
                    <StatRow label="Balls Bowled" stat="bowlingBalls" />
                    <StatRow label="Runs Conceded" stat="runsConceded" />
                    <StatRow label="Economy" stat="economy" />
                    <StatRow label="Average" stat="bowlingAvg" />
                    <StatRow label="Maidens" stat="maidens" />
                    <StatRow label="Wides" stat="wides" />
                    <StatRow label="No Balls" stat="noBalls" />
                    <StatRow label="3-fers" stat="threeFers" />
                    <StatRow label="5-fers" stat="fiveFers" />
                  </div>
                </CardContent>
              </Card>

              {/* Fielding Stats */}
              <Card variant="elevated">
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    🧤 Fielding Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 overflow-x-auto">
                  <div className="min-w-[500px]">
                    <StatRow label="Catches" stat="catches" />
                    <StatRow label="Run Outs" stat="runouts" />
                    <StatRow label="Stumpings" stat="stumpings" />
                    <StatRow label="Dropped Catches" stat="droppedCatches" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {selectedPlayers.length < 2 && (
            <Card variant="elevated" className="text-center py-12">
              <CardContent>
                <GitCompare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  Select at least 2 players to compare their stats and ICC points
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Compare;
