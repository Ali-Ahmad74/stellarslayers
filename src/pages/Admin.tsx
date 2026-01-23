import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Calendar, Settings, Plus, Edit, Trash2, LogOut, Activity, CalendarDays } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleBadge } from '@/components/RoleBadge';
import { PlayerDialog, PlayerFormData } from '@/components/dialogs/PlayerDialog';
import { MatchDialog, MatchFormData } from '@/components/dialogs/MatchDialog';
import { PerformanceDialog, PerformanceFormData } from '@/components/dialogs/PerformanceDialog';
import { SeasonDialog, SeasonFormData } from '@/components/dialogs/SeasonDialog';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlayerRole } from '@/types/cricket';
interface Player {
  id: number;
  name: string;
  role: string;
  batting_style: string | null;
  bowling_style: string | null;
  photo_url: string | null;
  created_at: string;
}

interface Match {
  id: number;
  match_date: string;
  overs: number;
  venue: string | null;
  opponent_name: string | null;
  our_score: number | null;
  opponent_score: number | null;
  result: string | null;
  created_at: string;
}

interface Season {
  id: number;
  name: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Edit states
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>();
  const [editingMatch, setEditingMatch] = useState<Match | undefined>();
  const [editingSeason, setEditingSeason] = useState<Season | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'player' | 'match' | 'season'; id: number; name: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    
    const [playersRes, matchesRes, seasonsRes] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('matches').select('*').order('match_date', { ascending: false }),
      supabase.from('seasons').select('*').order('year', { ascending: false }),
    ]);
    
    if (playersRes.data) setPlayers(playersRes.data);
    if (matchesRes.data) setMatches(matchesRes.data);
    if (seasonsRes.data) setSeasons(seasonsRes.data);
    
    setLoadingData(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Player CRUD
  const handleSavePlayer = async (data: PlayerFormData) => {
    setSaving(true);
    
    if (data.id) {
      const { error } = await supabase
        .from('players')
        .update({
          name: data.name,
          role: data.role,
          batting_style: data.batting_style,
          bowling_style: data.bowling_style,
          photo_url: data.photo_url,
        })
        .eq('id', data.id);
      
      if (error) {
        toast.error('Failed to update player: ' + error.message);
      } else {
        toast.success('Player updated successfully!');
        setPlayerDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('players')
        .insert({
          name: data.name,
          role: data.role,
          batting_style: data.batting_style,
          bowling_style: data.bowling_style,
          photo_url: data.photo_url,
        });
      
      if (error) {
        toast.error('Failed to add player: ' + error.message);
      } else {
        toast.success('Player added successfully!');
        setPlayerDialogOpen(false);
        fetchData();
      }
    }
    
    setSaving(false);
    setEditingPlayer(undefined);
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setPlayerDialogOpen(true);
  };

  // Match CRUD
  const handleSaveMatch = async (data: MatchFormData) => {
    setSaving(true);
    
    if (data.id) {
      const { error } = await supabase
        .from('matches')
        .update({
          match_date: data.match_date,
          overs: data.overs,
          venue: data.venue,
          opponent_name: data.opponent_name,
          our_score: data.our_score,
          opponent_score: data.opponent_score,
          result: data.result,
        })
        .eq('id', data.id);
      
      if (error) {
        toast.error('Failed to update match: ' + error.message);
      } else {
        toast.success('Match updated successfully!');
        setMatchDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('matches')
        .insert({
          match_date: data.match_date,
          overs: data.overs,
          venue: data.venue,
          opponent_name: data.opponent_name,
          our_score: data.our_score,
          opponent_score: data.opponent_score,
          result: data.result,
        });
      
      if (error) {
        toast.error('Failed to add match: ' + error.message);
      } else {
        toast.success('Match added successfully!');
        setMatchDialogOpen(false);
        fetchData();
      }
    }
    
    setSaving(false);
    setEditingMatch(undefined);
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setMatchDialogOpen(true);
  };

  // Season CRUD
  const handleSaveSeason = async (data: SeasonFormData) => {
    setSaving(true);
    
    // If marking as active, deactivate other seasons first
    if (data.is_active) {
      await supabase.from('seasons').update({ is_active: false }).neq('id', data.id || 0);
    }
    
    if (data.id) {
      const { error } = await supabase
        .from('seasons')
        .update({
          name: data.name,
          year: data.year,
          start_date: data.start_date,
          end_date: data.end_date,
          is_active: data.is_active,
        })
        .eq('id', data.id);
      
      if (error) {
        toast.error('Failed to update season: ' + error.message);
      } else {
        toast.success('Season updated successfully!');
        setSeasonDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('seasons')
        .insert({
          name: data.name,
          year: data.year,
          start_date: data.start_date,
          end_date: data.end_date,
          is_active: data.is_active,
        });
      
      if (error) {
        toast.error('Failed to add season: ' + error.message);
      } else {
        toast.success('Season added successfully!');
        setSeasonDialogOpen(false);
        fetchData();
      }
    }
    
    setSaving(false);
    setEditingSeason(undefined);
  };

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    setSeasonDialogOpen(true);
  };
  const handleSavePerformance = async (data: PerformanceFormData) => {
    setSaving(true);
    
    try {
      const errors: string[] = [];
      
      // Handle batting - check existing first, then insert or update
      if (data.batting.balls > 0 || data.batting.runs > 0) {
        const { data: existing } = await supabase
          .from('batting_inputs')
          .select('id')
          .eq('match_id', data.match_id)
          .eq('player_id', data.player_id)
          .maybeSingle();
        
        if (existing) {
          const { error } = await supabase
            .from('batting_inputs')
            .update({
              runs: data.batting.runs,
              balls: data.batting.balls,
              fours: data.batting.fours,
              sixes: data.batting.sixes,
              out: data.batting.out,
            })
            .eq('id', existing.id);
          if (error) errors.push('batting: ' + error.message);
        } else {
          const { error } = await supabase
            .from('batting_inputs')
            .insert({
              match_id: data.match_id,
              player_id: data.player_id,
              runs: data.batting.runs,
              balls: data.batting.balls,
              fours: data.batting.fours,
              sixes: data.batting.sixes,
              out: data.batting.out,
            });
          if (error) errors.push('batting: ' + error.message);
        }
      }
      
      // Handle bowling - check existing first, then insert or update
      if (data.bowling.balls > 0) {
        const { data: existing } = await supabase
          .from('bowling_inputs')
          .select('id')
          .eq('match_id', data.match_id)
          .eq('player_id', data.player_id)
          .maybeSingle();
        
        if (existing) {
          const { error } = await supabase
            .from('bowling_inputs')
            .update({
              balls: data.bowling.balls,
              runs_conceded: data.bowling.runs_conceded,
              wickets: data.bowling.wickets,
              maidens: data.bowling.maidens,
              wides: data.bowling.wides,
              no_balls: data.bowling.no_balls,
              fours_conceded: data.bowling.fours_conceded,
              sixes_conceded: data.bowling.sixes_conceded,
            })
            .eq('id', existing.id);
          if (error) errors.push('bowling: ' + error.message);
        } else {
          const { error } = await supabase
            .from('bowling_inputs')
            .insert({
              match_id: data.match_id,
              player_id: data.player_id,
              balls: data.bowling.balls,
              runs_conceded: data.bowling.runs_conceded,
              wickets: data.bowling.wickets,
              maidens: data.bowling.maidens,
              wides: data.bowling.wides,
              no_balls: data.bowling.no_balls,
              fours_conceded: data.bowling.fours_conceded,
              sixes_conceded: data.bowling.sixes_conceded,
            });
          if (error) errors.push('bowling: ' + error.message);
        }
      }
      
      // Handle fielding - check existing first, then insert or update
      if (data.fielding.catches > 0 || data.fielding.runouts > 0 || data.fielding.stumpings > 0 || data.fielding.dropped_catches > 0) {
        const { data: existing } = await supabase
          .from('fielding_inputs')
          .select('id')
          .eq('match_id', data.match_id)
          .eq('player_id', data.player_id)
          .maybeSingle();
        
        if (existing) {
          const { error } = await supabase
            .from('fielding_inputs')
            .update({
              catches: data.fielding.catches,
              runouts: data.fielding.runouts,
              stumpings: data.fielding.stumpings,
              dropped_catches: data.fielding.dropped_catches,
            })
            .eq('id', existing.id);
          if (error) errors.push('fielding: ' + error.message);
        } else {
          const { error } = await supabase
            .from('fielding_inputs')
            .insert({
              match_id: data.match_id,
              player_id: data.player_id,
              catches: data.fielding.catches,
              runouts: data.fielding.runouts,
              stumpings: data.fielding.stumpings,
              dropped_catches: data.fielding.dropped_catches,
            });
          if (error) errors.push('fielding: ' + error.message);
        }
      }
      
      if (errors.length > 0) {
        toast.error('Failed to save: ' + errors.join(', '));
      } else {
        toast.success('Performance saved successfully!');
        setPerformanceDialogOpen(false);
      }
    } catch (err) {
      toast.error('Failed to save performance data');
      // Error logged only in development to prevent information leakage
      if (import.meta.env.DEV) console.error(err);
    }
    
    setSaving(false);
  };

  // Delete
  const handleDeleteClick = (type: 'player' | 'match' | 'season', id: number, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    setSaving(true);
    
    const table = deleteTarget.type === 'player' ? 'players' : deleteTarget.type === 'match' ? 'matches' : 'seasons';
    const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);
    
    if (error) {
      toast.error(`Failed to delete ${deleteTarget.type}: ` + error.message);
    } else {
      const typeLabel = deleteTarget.type === 'player' ? 'Player' : deleteTarget.type === 'match' ? 'Match' : 'Season';
      toast.success(`${typeLabel} deleted successfully!`);
      fetchData();
    }
    
    setSaving(false);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                ⚙️ Admin Panel
              </h1>
              <p className="text-muted-foreground mt-1">
                {isAdmin ? 'Manage players, matches, and performance data' : 'View-only access (Admin role required for editing)'}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {!isAdmin && (
            <Card className="mb-8 border-amber-500/50 bg-amber-500/10">
              <CardContent className="p-4">
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  ⚠️ You need admin role to add, edit, or delete data. Contact an existing admin to grant you access.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Users, label: 'Players', value: players.length, color: 'bg-blue-500' },
              { icon: Calendar, label: 'Matches', value: matches.length, color: 'bg-emerald-500' },
              { icon: CalendarDays, label: 'Seasons', value: seasons.length, color: 'bg-amber-500' },
              { icon: Settings, label: 'Status', value: isAdmin ? 'Admin' : 'Viewer', color: 'bg-purple-500' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`${stat.color} p-3 rounded-xl text-white`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="players" className="w-full">
            <TabsList className="w-full justify-start mb-6 bg-card border shadow-sm rounded-xl p-1 h-auto flex-wrap">
              <TabsTrigger 
                value="players" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold"
              >
                <Users className="w-4 h-4 mr-2" />
                Players
              </TabsTrigger>
              <TabsTrigger 
                value="matches"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Matches
              </TabsTrigger>
              <TabsTrigger 
                value="performance"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold"
              >
                <Activity className="w-4 h-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger 
                value="seasons"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg font-semibold"
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Seasons
              </TabsTrigger>
            </TabsList>

            <TabsContent value="players">
              <Card variant="elevated">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Player Management</CardTitle>
                  {isAdmin && (
                    <Button onClick={() => { setEditingPlayer(undefined); setPlayerDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Player
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {loadingData ? (
                    <div className="p-8 text-center text-muted-foreground">Loading players...</div>
                  ) : players.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No players yet. {isAdmin && 'Add your first player to get started!'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Batting Style</TableHead>
                            <TableHead>Bowling Style</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {players.map((player) => (
                            <TableRow key={player.id} className="hover:bg-muted/30">
                              <TableCell className="font-mono">{player.id}</TableCell>
                              <TableCell className="font-semibold">{player.name}</TableCell>
                              <TableCell><RoleBadge role={player.role as PlayerRole} size="sm" /></TableCell>
                              <TableCell>{player.batting_style || '-'}</TableCell>
                              <TableCell>{player.bowling_style || '-'}</TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditPlayer(player)}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('player', player.id, player.name)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matches">
              <Card variant="elevated">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Match Management</CardTitle>
                  {isAdmin && (
                    <Button onClick={() => { setEditingMatch(undefined); setMatchDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Match
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {loadingData ? (
                    <div className="p-8 text-center text-muted-foreground">Loading matches...</div>
                  ) : matches.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No matches yet. {isAdmin && 'Add your first match to get started!'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Date</TableHead>
                            <TableHead>Opponent</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Overs</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {matches.map((match) => (
                            <TableRow key={match.id} className="hover:bg-muted/30">
                              <TableCell>
                                {new Date(match.match_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </TableCell>
                              <TableCell className="font-semibold">{match.opponent_name || '-'}</TableCell>
                              <TableCell>{match.venue || '-'}</TableCell>
                              <TableCell>
                                {match.our_score !== null && match.opponent_score !== null 
                                  ? `${match.our_score} - ${match.opponent_score}` 
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {match.result ? (
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                    match.result === 'Won' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    match.result === 'Lost' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {match.result}
                                  </span>
                                ) : '-'}
                              </TableCell>
                              <TableCell>{match.overs}</TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditMatch(match)}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('match', match.id, match.opponent_name || 'this match')}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card variant="elevated">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Player Performance Entry</CardTitle>
                  {isAdmin && (
                    <Button onClick={() => setPerformanceDialogOpen(true)} disabled={players.length === 0 || matches.length === 0}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Performance
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {players.length === 0 || matches.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      You need at least one player and one match to add performance data.
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Click "Add Performance" to record batting, bowling, and fielding stats for a player in a match.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seasons">
              <Card variant="elevated">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Season Management</CardTitle>
                  {isAdmin && (
                    <Button onClick={() => { setEditingSeason(undefined); setSeasonDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Season
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {loadingData ? (
                    <div className="p-8 text-center text-muted-foreground">Loading seasons...</div>
                  ) : seasons.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No seasons yet. {isAdmin && 'Add your first season to get started!'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Name</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Status</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {seasons.map((season) => (
                            <TableRow key={season.id} className="hover:bg-muted/30">
                              <TableCell className="font-semibold">{season.name}</TableCell>
                              <TableCell>{season.year}</TableCell>
                              <TableCell>
                                {season.start_date 
                                  ? new Date(season.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {season.end_date 
                                  ? new Date(season.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {season.is_active ? (
                                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                                    Inactive
                                  </span>
                                )}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditSeason(season)}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('season', season.id, season.name)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Dialogs */}
      <PlayerDialog
        open={playerDialogOpen}
        onOpenChange={(open) => { setPlayerDialogOpen(open); if (!open) setEditingPlayer(undefined); }}
        onSave={handleSavePlayer}
        player={editingPlayer ? { ...editingPlayer, role: editingPlayer.role as PlayerRole } : undefined}
        isLoading={saving}
      />

      <MatchDialog
        open={matchDialogOpen}
        onOpenChange={(open) => { setMatchDialogOpen(open); if (!open) setEditingMatch(undefined); }}
        onSave={handleSaveMatch}
        match={editingMatch}
        isLoading={saving}
      />

      <PerformanceDialog
        open={performanceDialogOpen}
        onOpenChange={setPerformanceDialogOpen}
        onSave={handleSavePerformance}
        players={players}
        matches={matches}
        isLoading={saving}
      />

      <SeasonDialog
        open={seasonDialogOpen}
        onOpenChange={(open) => { setSeasonDialogOpen(open); if (!open) setEditingSeason(undefined); }}
        onSave={handleSaveSeason}
        season={editingSeason}
        isLoading={saving}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteTarget?.type === 'player' ? 'Player' : deleteTarget?.type === 'match' ? 'Match' : 'Season'}?`}
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isLoading={saving}
      />
    </div>
  );
};

export default Admin;
