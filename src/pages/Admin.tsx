import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Calendar, Settings, Plus, Edit, Trash2, LogOut, Activity, CalendarDays, Trophy, Info, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleBadge } from '@/components/RoleBadge';
import { PlayerDialog, PlayerFormData } from '@/components/dialogs/PlayerDialog';
import { MatchDialog, MatchFormData } from '@/components/dialogs/MatchDialog';
import { PerformanceDialog, PerformanceFormData } from '@/components/dialogs/PerformanceDialog';
import { SeasonDialog, SeasonFormData } from '@/components/dialogs/SeasonDialog';
import { TournamentDialog, TournamentFormData } from '@/components/dialogs/TournamentDialog';
import { SeriesDialog, SeriesFormData } from '@/components/dialogs/SeriesDialog';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { DataHealthDashboard } from '@/components/DataHealthDashboard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlayerRole } from '@/types/cricket';

import { useTeamSettings } from '@/hooks/useTeamSettings';
import { TeamLogoUpload } from '@/components/TeamLogoUpload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScoringSettingsPanel } from '@/components/ScoringSettingsPanel';
import { MatchEntryGrid } from '@/components/MatchEntryGrid';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  tournament_id: number | null;
  series_id?: number | null;
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

interface Tournament {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  tournament_type: string | null;
  is_active: boolean;
  created_at: string;
}

interface Series {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  is_active: boolean;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('players');

  const { teamSettings, updateTeamSettings } = useTeamSettings();
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [teamDescriptionDraft, setTeamDescriptionDraft] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);
  
  // Dialog states
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSampleDialogOpen, setDeleteSampleDialogOpen] = useState(false);

  // Bulk assign matches -> series
  const [bulkAssignSeriesId, setBulkAssignSeriesId] = useState<string>('');
  const [bulkAssignMode, setBulkAssignMode] = useState<'unassigned' | 'all'>('unassigned');
  const [bulkAssignMatchIds, setBulkAssignMatchIds] = useState<Record<number, boolean>>({});
  const [bulkAssignSaving, setBulkAssignSaving] = useState(false);

  // Performance tab filtering
  const [performanceSeriesId, setPerformanceSeriesId] = useState<string>('all');
  const [performanceTournamentId, setPerformanceTournamentId] = useState<string>('all');
  
  // Edit states
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>();
  const [editingMatch, setEditingMatch] = useState<Match | undefined>();
  const [editingSeason, setEditingSeason] = useState<Season | undefined>();
  const [editingTournament, setEditingTournament] = useState<Tournament | undefined>();
  const [editingSeries, setEditingSeries] = useState<Series | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'player' | 'match' | 'season' | 'tournament' | 'series'; id: number; name: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);


  useEffect(() => {
    if (!loading && user && !isAdmin) {
      navigate('/');
    }
  }, [loading, user, isAdmin, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (!bulkAssignSeriesId && series.length > 0) {
      setBulkAssignSeriesId(String(series[0].id));
    }
  }, [series, bulkAssignSeriesId]);

  useEffect(() => {
    if (!teamSettings) return;
    setTeamNameDraft(teamSettings.team_name || '');
    setTeamDescriptionDraft(teamSettings.description || '');
  }, [teamSettings]);

  const fetchData = async () => {
    setLoadingData(true);
    
    const [playersRes, matchesRes, seasonsRes, tournamentsRes, seriesRes] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('matches').select('*').order('match_date', { ascending: false }),
      supabase.from('seasons').select('*').order('year', { ascending: false }),
      supabase.from('tournaments').select('*').order('start_date', { ascending: false }),
      supabase.from('series').select('*').order('is_active', { ascending: false }).order('start_date', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    
    if (playersRes.data) setPlayers(playersRes.data);
    if (matchesRes.data) setMatches(matchesRes.data as Match[]);
    if (seasonsRes.data) setSeasons(seasonsRes.data);
    if (tournamentsRes.data) setTournaments(tournamentsRes.data);
    if (seriesRes.data) setSeries(seriesRes.data as any);
    
    setLoadingData(false);
  };

  const handleSaveTeamSettings = async () => {
    if (!isAdmin) return;
    const name = teamNameDraft.trim();
    if (!name) {
      toast.error('Team name is required');
      return;
    }
    setSavingTeam(true);
    try {
      await updateTeamSettings({
        team_name: name,
        description: teamDescriptionDraft.trim() || null,
      });
      toast.success('Team settings updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update team settings');
    } finally {
      setSavingTeam(false);
    }
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
          tournament_id: data.tournament_id,
          series_id: data.series_id,
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
          tournament_id: data.tournament_id,
          series_id: data.series_id,
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

  // Tournament CRUD
  const handleSaveTournament = async (data: TournamentFormData) => {
    setSaving(true);
    
    if (data.is_active) {
      await supabase.from('tournaments').update({ is_active: false }).neq('id', data.id || 0);
    }
    
    if (data.id) {
      const { error } = await supabase
        .from('tournaments')
        .update({
          name: data.name,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date,
          venue: data.venue,
          tournament_type: data.tournament_type,
          is_active: data.is_active,
        })
        .eq('id', data.id);
      
      if (error) {
        toast.error('Failed to update tournament: ' + error.message);
      } else {
        toast.success('Tournament updated successfully!');
        setTournamentDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('tournaments')
        .insert({
          name: data.name,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date,
          venue: data.venue,
          tournament_type: data.tournament_type,
          is_active: data.is_active,
        });
      
      if (error) {
        toast.error('Failed to add tournament: ' + error.message);
      } else {
        toast.success('Tournament added successfully!');
        setTournamentDialogOpen(false);
        fetchData();
      }
    }
    
    setSaving(false);
    setEditingTournament(undefined);
  };

  const handleEditTournament = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setTournamentDialogOpen(true);
  };

  const handleBulkAssign = async () => {
    const sid = Number(bulkAssignSeriesId);
    const targetSeriesId = Number.isFinite(sid) ? sid : null;
    const selectedIds = Object.entries(bulkAssignMatchIds)
      .filter(([, v]) => v)
      .map(([k]) => Number(k))
      .filter((n) => Number.isFinite(n));

    if (!targetSeriesId) {
      toast.error('Select a series first');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Select at least 1 match');
      return;
    }

    setBulkAssignSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({ series_id: targetSeriesId })
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`Assigned ${selectedIds.length} match(es) to series`);
      setBulkAssignMatchIds({});
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign matches');
    } finally {
      setBulkAssignSaving(false);
    }
  };

  // Series CRUD
  const handleSaveSeries = async (data: SeriesFormData) => {
    setSaving(true);

    if (data.is_active) {
      await supabase.from('series').update({ is_active: false }).neq('id', data.id || 0);
    }

    if (data.id) {
      const { error } = await supabase
        .from('series')
        .update({
          name: data.name,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date,
          venue: data.venue,
          is_active: data.is_active,
        })
        .eq('id', data.id);

      if (error) {
        toast.error('Failed to update series: ' + error.message);
      } else {
        toast.success('Series updated successfully!');
        setSeriesDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('series')
        .insert({
          name: data.name,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date,
          venue: data.venue,
          is_active: data.is_active,
        });

      if (error) {
        toast.error('Failed to add series: ' + error.message);
      } else {
        toast.success('Series added successfully!');
        setSeriesDialogOpen(false);
        fetchData();
      }
    }

    setSaving(false);
    setEditingSeries(undefined);
  };

  const handleEditSeries = (s: Series) => {
    setEditingSeries(s);
    setSeriesDialogOpen(true);
  };

  const handleSavePerformance = async (data: PerformanceFormData) => {
    setSaving(true);
    
    try {
      const errors: string[] = [];
      
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
      if (import.meta.env.DEV) console.error(err);
    }
    
    setSaving(false);
  };

  // Delete
  const handleDeleteClick = (type: 'player' | 'match' | 'season' | 'tournament' | 'series', id: number, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    setSaving(true);
    
    const table =
      deleteTarget.type === 'player'
        ? 'players'
        : deleteTarget.type === 'match'
          ? 'matches'
          : deleteTarget.type === 'season'
            ? 'seasons'
            : deleteTarget.type === 'tournament'
              ? 'tournaments'
              : 'series';
    const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);
    
    if (error) {
      toast.error(`Failed to delete ${deleteTarget.type}: ` + error.message);
    } else {
      const typeLabel = deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1);
      toast.success(`${typeLabel} deleted successfully!`);
      fetchData();
    }
    
    setSaving(false);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleConfirmDeleteSampleData = async () => {
    setSaving(true);
    try {
      // 1) Identify sample entities
      const [samplePlayersRes, sampleSeriesRes] = await Promise.all([
        supabase.from('players').select('id').like('name', '(Sample)%'),
        supabase.from('series').select('id').like('name', '(Sample)%'),
      ]);

      if (samplePlayersRes.error) throw samplePlayersRes.error;
      if (sampleSeriesRes.error) throw sampleSeriesRes.error;

      const samplePlayerIds = (samplePlayersRes.data || []).map((r) => r.id);
      const sampleSeriesIds = (sampleSeriesRes.data || []).map((r) => r.id);

      // Matches don't have a name column; sample matches were seeded with opponent_name like '(Sample)%'
      // and are also associated to sample series.
      const sampleMatchesByOpponentRes = await supabase
        .from('matches')
        .select('id')
        .like('opponent_name', '(Sample)%');
      if (sampleMatchesByOpponentRes.error) throw sampleMatchesByOpponentRes.error;

      const sampleMatchIds = new Set<number>((sampleMatchesByOpponentRes.data || []).map((r) => r.id));

      if (sampleSeriesIds.length > 0) {
        const sampleMatchesBySeriesRes = await supabase
          .from('matches')
          .select('id')
          .in('series_id', sampleSeriesIds as any);
        if (sampleMatchesBySeriesRes.error) throw sampleMatchesBySeriesRes.error;
        (sampleMatchesBySeriesRes.data || []).forEach((r) => sampleMatchIds.add(r.id));
      }

      const matchIds = Array.from(sampleMatchIds);

      if (samplePlayerIds.length === 0 && sampleSeriesIds.length === 0 && matchIds.length === 0) {
        toast.info('No sample data found to delete');
        setDeleteSampleDialogOpen(false);
        return;
      }

      // 2) Delete performance inputs first
      const inputOrParts: string[] = [];
      if (samplePlayerIds.length > 0) inputOrParts.push(`player_id.in.(${samplePlayerIds.join(',')})`);
      if (matchIds.length > 0) inputOrParts.push(`match_id.in.(${matchIds.join(',')})`);
      const inputsOrFilter = inputOrParts.join(',');

      if (inputsOrFilter) {
        const [batDel, bowlDel, fieldDel] = await Promise.all([
          supabase.from('batting_inputs').delete().or(inputsOrFilter),
          supabase.from('bowling_inputs').delete().or(inputsOrFilter),
          supabase.from('fielding_inputs').delete().or(inputsOrFilter),
        ]);
        if (batDel.error) throw batDel.error;
        if (bowlDel.error) throw bowlDel.error;
        if (fieldDel.error) throw fieldDel.error;
      }

      // 3) Delete matches, then players/series
      if (matchIds.length > 0) {
        const { error } = await supabase.from('matches').delete().in('id', matchIds);
        if (error) throw error;
      }

      if (samplePlayerIds.length > 0) {
        const { error } = await supabase.from('players').delete().in('id', samplePlayerIds);
        if (error) throw error;
      }

      if (sampleSeriesIds.length > 0) {
        const { error } = await supabase.from('series').delete().in('id', sampleSeriesIds as any);
        if (error) throw error;
      }

      toast.success('Sample data deleted');
      fetchData();
      setDeleteSampleDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete sample data');
    } finally {
      setSaving(false);
    }
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Admin access required</CardTitle>
              <CardDescription>You don’t have permission to view this page.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={() => navigate('/')}>Go Home</Button>
              <Button variant="outline" onClick={() => navigate('/auth')}>Switch Account</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const getTournamentName = (tournamentId: number | null) => {
    if (!tournamentId) return null;
    return tournaments.find(t => t.id === tournamentId)?.name || null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Admin Panel
              </h1>
              <p className="text-muted-foreground mt-1">
                {isAdmin ? 'Manage players, matches, tournaments, and performance data' : 'View-only access (Admin role required for editing)'}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>


          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
               {[
              { icon: Users, label: 'Players', value: players.length, color: 'bg-blue-500' },
              { icon: Calendar, label: 'Matches', value: matches.length, color: 'bg-emerald-500' },
              { icon: Trophy, label: 'Tournaments', value: tournaments.length, color: 'bg-purple-500' },
              { icon: CalendarDays, label: 'Seasons', value: seasons.length, color: 'bg-amber-500' },
              { icon: Settings, label: 'Status', value: isAdmin ? 'Admin' : 'Viewer', color: 'bg-cyan-500' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`${stat.color} p-3 rounded-xl text-white`}>
                      <stat.icon className="w-5 h-5" />
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start mb-6 bg-card border border-border shadow-md rounded-xl p-1.5 h-auto flex-wrap gap-1">
              <TabsTrigger 
                value="players" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 md:px-6 py-2.5 rounded-lg font-semibold"
              >
                <Users className="w-4 h-4 mr-2" />
                Players
              </TabsTrigger>
              <TabsTrigger 
                value="matches"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 md:px-6 py-2.5 rounded-lg font-semibold"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Matches
              </TabsTrigger>
              <TabsTrigger 
                value="tournaments"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 md:px-6 py-2.5 rounded-lg font-semibold"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Tournaments
              </TabsTrigger>
              <TabsTrigger 
                value="series"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 md:px-6 py-2.5 rounded-lg font-semibold"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Series
              </TabsTrigger>
              <TabsTrigger 
                value="performance"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 md:px-6 py-2.5 rounded-lg font-semibold"
              >
                <Activity className="w-4 h-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger 
                value="seasons"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 md:px-6 py-2.5 rounded-lg font-semibold"
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Seasons
              </TabsTrigger>
              <TabsTrigger 
                value="team"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 md:px-6 py-2.5 rounded-lg font-semibold"
              >
                <Settings className="w-4 h-4 mr-2" />
                Team Settings
              </TabsTrigger>
              <TabsTrigger 
                value="scoring"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 md:px-6 py-2.5 rounded-lg font-semibold"
              >
                <Info className="w-4 h-4 mr-2" />
                Scoring
              </TabsTrigger>
              <TabsTrigger 
                value="health"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 md:px-6 py-2.5 rounded-lg font-semibold"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Data Health
              </TabsTrigger>
            </TabsList>

            <TabsContent value="players">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Player Management</CardTitle>
                    <CardDescription>Add and manage your team's players</CardDescription>
                  </div>
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
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No players yet.</p>
                      {isAdmin && <p className="text-sm mt-2">Click "Add Player" to get started!</p>}
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
                              <TableCell className="font-mono text-xs">{player.id}</TableCell>
                              <TableCell className="font-semibold">{player.name}</TableCell>
                              <TableCell><RoleBadge role={player.role as PlayerRole} size="sm" /></TableCell>
                              <TableCell className="text-muted-foreground">{player.batting_style || '-'}</TableCell>
                              <TableCell className="text-muted-foreground">{player.bowling_style || '-'}</TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleEditPlayer(player)}>
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit player</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('player', player.id, player.name)}>
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete player</TooltipContent>
                                    </Tooltip>
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Match Management</CardTitle>
                    <CardDescription>Record and manage your matches</CardDescription>
                  </div>
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
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No matches yet.</p>
                      {isAdmin && <p className="text-sm mt-2">Click "Add Match" to record your first game!</p>}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Date</TableHead>
                            <TableHead>Opponent</TableHead>
                            <TableHead>Tournament</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Overs</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {matches.map((match) => (
                            <TableRow key={match.id} className="hover:bg-muted/30">
                              <TableCell className="whitespace-nowrap">
                                {new Date(match.match_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </TableCell>
                              <TableCell className="font-semibold">{match.opponent_name || '-'}</TableCell>
                              <TableCell>
                                {getTournamentName(match.tournament_id) ? (
                                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                    {getTournamentName(match.tournament_id)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
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

            <TabsContent value="tournaments">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Tournament Management</CardTitle>
                    <CardDescription>Create tournaments to group your matches</CardDescription>
                  </div>
                  {isAdmin && (
                    <Button onClick={() => { setEditingTournament(undefined); setTournamentDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tournament
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {loadingData ? (
                    <div className="p-8 text-center text-muted-foreground">Loading tournaments...</div>
                  ) : tournaments.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No tournaments yet.</p>
                      {isAdmin && <p className="text-sm mt-2">Create a tournament to organize your matches!</p>}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Matches</TableHead>
                            <TableHead>Status</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tournaments.map((tournament) => {
                            const matchCount = matches.filter(m => m.tournament_id === tournament.id).length;
                            return (
                              <TableRow key={tournament.id} className="hover:bg-muted/30">
                                <TableCell className="font-semibold">{tournament.name}</TableCell>
                                <TableCell className="capitalize">{tournament.tournament_type || 'League'}</TableCell>
                                <TableCell className="text-muted-foreground">{tournament.venue || '-'}</TableCell>
                                <TableCell className="whitespace-nowrap text-sm">
                                  {tournament.start_date && tournament.end_date ? (
                                    <>
                                      {new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      {' - '}
                                      {new Date(tournament.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </>
                                  ) : '-'}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-muted">
                                    {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {tournament.is_active ? (
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
                                      <Button variant="ghost" size="icon" onClick={() => handleEditTournament(tournament)}>
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('tournament', tournament.id, tournament.name)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="series">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Series Management</CardTitle>
                    <CardDescription>Create series to group matches and generate highlights</CardDescription>
                  </div>
                  {isAdmin && (
                    <Button onClick={() => { setEditingSeries(undefined); setSeriesDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Series
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {loadingData ? (
                    <div className="p-8 text-center text-muted-foreground">Loading series...</div>
                  ) : series.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No series yet.</p>
                      {isAdmin && <p className="text-sm mt-2">Create a series to organize your matches!</p>}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Name</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Matches</TableHead>
                            <TableHead>Status</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {series.map((s) => {
                            const matchCount = matches.filter((m) => Number(m.series_id) === Number(s.id)).length;
                            const dateLabel =
                              s.start_date && s.end_date
                                ? `${new Date(s.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(
                                    s.end_date
                                  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                : '-';
                            return (
                              <TableRow key={s.id} className="hover:bg-muted/30">
                                <TableCell className="font-semibold">{s.name}</TableCell>
                                <TableCell className="text-muted-foreground">{s.venue || '-'}</TableCell>
                                <TableCell className="whitespace-nowrap text-sm">{dateLabel}</TableCell>
                                <TableCell>
                                  <span className="inline-flex">
                                    <span className="sr-only">Matches: </span>
                                    <span className="text-xs text-muted-foreground tabular-nums">{matchCount}</span>
                                    <span className="text-xs text-muted-foreground ml-1">{matchCount === 1 ? 'match' : 'matches'}</span>
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {s.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                                </TableCell>
                                {isAdmin && (
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button variant="ghost" size="icon" onClick={() => handleEditSeries(s)}>
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('series', s.id, s.name)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader className="space-y-2">
                  <CardTitle>Bulk assign matches to series</CardTitle>
                  <CardDescription>Select a series, tick matches, and assign in one action</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Target series</Label>
                      <Select value={bulkAssignSeriesId} onValueChange={setBulkAssignSeriesId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select series" />
                        </SelectTrigger>
                        <SelectContent>
                          {series.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Matches list</Label>
                      <Select value={bulkAssignMode} onValueChange={(v) => setBulkAssignMode(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned only</SelectItem>
                          <SelectItem value="all">All matches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end md:justify-end">
                      <Button onClick={handleBulkAssign} disabled={bulkAssignSaving}>
                        {bulkAssignSaving ? 'Assigning…' : 'Assign selected'}
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[320px] rounded-lg border border-border">
                    <div className="p-3 space-y-2">
                      {matches
                        .filter((m) => (bulkAssignMode === 'unassigned' ? !m.series_id : true))
                        .map((m) => {
                          const checked = Boolean(bulkAssignMatchIds[m.id]);
                          const label = `${new Date(m.match_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} • ${m.opponent_name || 'Match'}${m.venue ? ` • ${m.venue}` : ''}`;
                          return (
                            <label key={m.id} className="flex items-start gap-3 rounded-md border bg-card p-3 cursor-pointer">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => setBulkAssignMatchIds((prev) => ({ ...prev, [m.id]: Boolean(v) }))}
                              />
                              <div className="min-w-0">
                                <div className="font-medium truncate">{label}</div>
                                <div className="text-xs text-muted-foreground">Match ID: {m.id}</div>
                              </div>
                            </label>
                          );
                        })}
                      {matches.filter((m) => (bulkAssignMode === 'unassigned' ? !m.series_id : true)).length === 0 && (
                        <div className="text-sm text-muted-foreground">No matches found for this list.</div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Single Player Entry</CardTitle>
                      <CardDescription>Record batting, bowling, and fielding stats for one player in a match</CardDescription>
                    </div>
                    <Button onClick={() => setPerformanceDialogOpen(true)} disabled={players.length === 0 || matches.length === 0}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Performance
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {players.length === 0 || matches.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>You need at least one player and one match to add performance data.</p>
                        <p className="text-sm mt-2">
                          {players.length === 0 ? 'Start by adding players.' : 'Start by adding a match.'}
                        </p>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="font-medium">Ready to record performance!</p>
                        <p className="text-sm mt-2">Click "Add Performance" to record stats for a player in a match.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {players.length > 0 && matches.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <CardTitle>Bulk Entry (Grid)</CardTitle>
                        <CardDescription>Optionally filter matches by tournament and series before entering performance</CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Tournament</span>
                          <Select value={performanceTournamentId} onValueChange={setPerformanceTournamentId}>
                            <SelectTrigger className="w-[260px]">
                              <SelectValue placeholder="All tournaments" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All tournaments</SelectItem>
                              <SelectItem value="none">No tournament</SelectItem>
                              {tournaments.map((t) => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Series</span>
                          <Select value={performanceSeriesId} onValueChange={setPerformanceSeriesId}>
                            <SelectTrigger className="w-[260px]">
                              <SelectValue placeholder="All series" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All series</SelectItem>
                              <SelectItem value="none">No series</SelectItem>
                              {series.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <MatchEntryGrid
                        players={players.map((p) => ({ id: p.id, name: p.name }))}
                        matches={matches
                          .filter((m) => {
                            if (performanceTournamentId === 'all') return true;
                            if (performanceTournamentId === 'none') return !m.tournament_id;
                            return Number(m.tournament_id) === Number(performanceTournamentId);
                          })
                          .filter((m) => {
                            if (performanceSeriesId === 'all') return true;
                            if (performanceSeriesId === 'none') return !m.series_id;
                            return Number(m.series_id) === Number(performanceSeriesId);
                          })
                          .map((m) => ({ id: m.id, match_date: m.match_date, venue: m.venue }))}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="seasons">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Season Management</CardTitle>
                    <CardDescription>Organize matches by season</CardDescription>
                  </div>
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
                      <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No seasons yet.</p>
                      {isAdmin && <p className="text-sm mt-2">Create a season to organize your matches!</p>}
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

            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>Team Settings</CardTitle>
                  <CardDescription>Manage team name, description, and logo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <TeamLogoUpload
                      currentLogoUrl={teamSettings?.team_logo_url || null}
                      onLogoChange={() => {
                        // upload component updates backend; team settings are kept in sync via realtime.
                      }}
                      isAdmin={isAdmin}
                    />
                    <div className="flex-1 grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="admin-team-name">Team name</Label>
                        <Input
                          id="admin-team-name"
                          value={teamNameDraft}
                          onChange={(e) => setTeamNameDraft(e.target.value)}
                          maxLength={80}
                          placeholder="e.g., City Strikers"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="admin-team-desc">Description</Label>
                        <Textarea
                          id="admin-team-desc"
                          value={teamDescriptionDraft}
                          onChange={(e) => setTeamDescriptionDraft(e.target.value)}
                          maxLength={300}
                          className="min-h-[100px]"
                          placeholder="Shown on the Team page"
                          disabled={!isAdmin}
                        />
                      </div>
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            disabled={savingTeam}
                            onClick={() => {
                              setTeamNameDraft(teamSettings?.team_name || '');
                              setTeamDescriptionDraft(teamSettings?.description || '');
                            }}
                          >
                            Reset
                          </Button>
                          <Button disabled={savingTeam} onClick={handleSaveTeamSettings}>
                            {savingTeam ? 'Saving…' : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-4 border-t border-border">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-muted-foreground" />
                            <p className="font-semibold">Sample data</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Deletes only records whose names start with “(Sample)” (plus related performance inputs).
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          className="gap-2"
                          disabled={saving}
                          onClick={() => setDeleteSampleDialogOpen(true)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete sample data
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scoring">
              <ScoringSettingsPanel />
            </TabsContent>

            <TabsContent value="health">
              <DataHealthDashboard 
                players={players.map(p => ({ id: p.id, name: p.name }))}
                matches={matches.map(m => ({ 
                  id: m.id, 
                  match_date: m.match_date, 
                  venue: m.venue,
                  series_id: m.series_id,
                  our_score: m.our_score,
                  opponent_score: m.opponent_score,
                  result: m.result,
                }))}
                series={series.map(s => ({ id: s.id, name: s.name }))}
              />
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
        tournaments={tournaments.map(t => ({ id: t.id, name: t.name }))}
        seriesOptions={series.map(s => ({ id: s.id, name: s.name }))}
        isLoading={saving}
      />

      <SeriesDialog
        open={seriesDialogOpen}
        onOpenChange={(open) => { setSeriesDialogOpen(open); if (!open) setEditingSeries(undefined); }}
        onSave={handleSaveSeries}
        series={editingSeries}
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

      <TournamentDialog
        open={tournamentDialogOpen}
        onOpenChange={(open) => { setTournamentDialogOpen(open); if (!open) setEditingTournament(undefined); }}
        onSave={handleSaveTournament}
        tournament={editingTournament}
        saving={saving}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteTarget?.type ? deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1) : ''}?`}
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isLoading={saving}
      />

      <DeleteConfirmDialog
        open={deleteSampleDialogOpen}
        onOpenChange={setDeleteSampleDialogOpen}
        onConfirm={handleConfirmDeleteSampleData}
        title="Delete sample data?"
        description='This will remove all records prefixed with "(Sample)" (players, series, matches) and all related performance inputs. This action cannot be undone.'
        isLoading={saving}
      />
    </div>
  );
};

export default Admin;