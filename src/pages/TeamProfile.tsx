import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerRankings } from '@/hooks/usePlayerRankings';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Trophy, Target, Calendar, MapPin, Users, Star, Award, TrendingUp } from 'lucide-react';
import { TeamLogoUpload } from '@/components/TeamLogoUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SiteFooter } from '@/components/SiteFooter';
import { useTeamSettings } from '@/hooks/useTeamSettings';

interface Match {
  id: number;
  match_date: string;
  result: string | null;
  our_score: number | null;
  opponent_score: number | null;
  opponent_name: string | null;
  venue: string | null;
}

interface SeasonStats {
  year: number;
  matches: number;
  wins: number;
  losses: number;
  totalRuns: number;
  totalWickets: number;
}

const TeamProfile = () => {
  const { players, loading: playersLoading } = usePlayerRankings();
  const { isAdmin } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { teamSettings, updateTeamSettings } = useTeamSettings();
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [teamDescriptionDraft, setTeamDescriptionDraft] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [matchesRes] = await Promise.all([
        supabase.from('matches').select('*').order('match_date', { ascending: false }),
      ]);
      
      setMatches(matchesRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!teamSettings) return;
    setTeamNameDraft(teamSettings.team_name || '');
    setTeamDescriptionDraft(teamSettings.description || '');
  }, [teamSettings]);

  const handleSaveBranding = async () => {
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
      toast.success('Team branding updated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update team branding';
      toast.error(msg);
    } finally {
      setSavingTeam(false);
    }
  };

  const isLoading = loading || playersLoading;

  // Calculate season history
  const seasonStats: SeasonStats[] = matches.reduce((acc: SeasonStats[], match) => {
    const year = new Date(match.match_date).getFullYear();
    const existing = acc.find(s => s.year === year);
    if (existing) {
      existing.matches += 1;
      existing.wins += match.result === 'Won' ? 1 : 0;
      existing.losses += match.result === 'Lost' ? 1 : 0;
      existing.totalRuns += match.our_score || 0;
    } else {
      acc.push({
        year,
        matches: 1,
        wins: match.result === 'Won' ? 1 : 0,
        losses: match.result === 'Lost' ? 1 : 0,
        totalRuns: match.our_score || 0,
        totalWickets: 0,
      });
    }
    return acc;
  }, []).sort((a, b) => b.year - a.year);

  // Team achievements
  const totalWins = matches.filter(m => m.result === 'Won').length;
  const totalMatches = matches.length;
  const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0';
  const totalRuns = players.reduce((sum, p) => sum + (p.stats?.total_runs || 0), 0);
  const totalWickets = players.reduce((sum, p) => sum + (p.stats?.wickets || 0), 0);
  const totalHundreds = players.reduce((sum, p) => sum + (p.stats?.hundreds || 0), 0);
  const totalFifties = players.reduce((sum, p) => sum + (p.stats?.fifties || 0), 0);

  // Find best performances
  const highestScore = matches.reduce((max, m) => 
    (m.our_score || 0) > max ? (m.our_score || 0) : max, 0);
  const biggestWin = matches
    .filter(m => m.result === 'Won' && m.our_score && m.opponent_score)
    .reduce((max, m) => {
      const margin = (m.our_score || 0) - (m.opponent_score || 0);
      return margin > max.margin ? { margin, match: m } : max;
    }, { margin: 0, match: null as Match | null });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8 md:py-12">
        {/* Team Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <TeamLogoUpload 
                currentLogoUrl={teamSettings?.team_logo_url || null}
                onLogoChange={() => {
                  // TeamLogoUpload already updates backend; this forces the header/footer to refresh on next navigation.
                  // Team page itself will still show the new logo immediately.
                }}
                isAdmin={isAdmin}
              />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2 font-display">
            {teamSettings?.team_name || 'Stellar Slayers'}
          </h1>
          <p className="text-xl text-primary font-semibold mb-4">Cricket Club</p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {teamSettings?.description || 'A passionate cricket team dedicated to excellence, sportsmanship, and the love of the game. Founded with a vision to nurture talent and compete at the highest levels.'}
          </p>

          {isAdmin && (
            <div className="mt-8 mx-auto max-w-2xl text-left">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="font-display text-lg font-semibold">Team branding</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Update your team name and description (logo upload is above).
                </p>

                <div className="mt-4 grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="team-name">Team name</Label>
                    <Input
                      id="team-name"
                      value={teamNameDraft}
                      onChange={(e) => setTeamNameDraft(e.target.value)}
                      maxLength={80}
                      placeholder="e.g., City Strikers"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="team-desc">Description</Label>
                    <Textarea
                      id="team-desc"
                      value={teamDescriptionDraft}
                      onChange={(e) => setTeamDescriptionDraft(e.target.value)}
                      maxLength={300}
                      placeholder="A short description shown on the Team page"
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTeamNameDraft(teamSettings?.team_name || '');
                        setTeamDescriptionDraft(teamSettings?.description || '');
                      }}
                      disabled={savingTeam}
                    >
                      Reset
                    </Button>
                    <Button onClick={handleSaveBranding} disabled={savingTeam}>
                      {savingTeam ? 'Saving…' : 'Save branding'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { label: 'Total Matches', value: totalMatches, icon: Calendar, color: 'text-primary' },
            { label: 'Win Rate', value: `${winRate}%`, icon: Trophy, color: 'text-emerald-500' },
            { label: 'Squad Size', value: players.length, icon: Users, color: 'text-blue-500' },
            { label: 'Total Runs', value: totalRuns.toLocaleString(), icon: TrendingUp, color: 'text-amber-500' },
          ].map((stat, index) => (
            <Card key={stat.label} variant="stat">
              <CardContent className="p-6 text-center">
                <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Team Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-accent" />
            Team Achievements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Total Victories', value: totalWins, icon: '🏆', desc: 'Matches won' },
              { title: 'Highest Score', value: highestScore, icon: '💯', desc: 'Team total' },
              { title: 'Centuries', value: totalHundreds, icon: '⭐', desc: 'Individual 100s' },
              { title: 'Half Centuries', value: totalFifties, icon: '🎯', desc: 'Individual 50s' },
              { title: 'Total Wickets', value: totalWickets, icon: '🎳', desc: 'Across all matches' },
              { title: 'Total Runs', value: totalRuns, icon: '🏏', desc: 'Team aggregate' },
              { 
                title: 'Biggest Win', 
                value: biggestWin.margin > 0 ? `${biggestWin.margin} runs` : 'N/A', 
                icon: '🔥', 
                desc: biggestWin.match?.opponent_name ? `vs ${biggestWin.match.opponent_name}` : 'Margin'
              },
              { title: 'Seasons', value: seasonStats.length, icon: '📅', desc: 'Years active' },
            ].map((achievement, index) => (
              <motion.div
                key={achievement.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Card variant="elevated" className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{achievement.icon}</span>
                      <div>
                        <p className="text-2xl font-bold">{achievement.value}</p>
                        <p className="font-medium text-sm">{achievement.title}</p>
                        <p className="text-xs text-muted-foreground">{achievement.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Season History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Season History
          </h2>
          {seasonStats.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No season data available yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {seasonStats.map((season, index) => (
                <motion.div
                  key={season.year}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Card variant="elevated">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl">
                            {season.year}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">Season {season.year}</h3>
                            <p className="text-muted-foreground text-sm">
                              {season.matches} matches played
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-500">{season.wins}</p>
                            <p className="text-xs text-muted-foreground">Wins</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-red-500">{season.losses}</p>
                            <p className="text-xs text-muted-foreground">Losses</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{season.totalRuns}</p>
                            <p className="text-xs text-muted-foreground">Runs</p>
                          </div>
                          <Badge 
                            variant={season.wins > season.losses ? 'default' : 'secondary'}
                            className={season.wins > season.losses ? 'bg-emerald-500' : ''}
                          >
                            {season.matches > 0 
                              ? `${((season.wins / season.matches) * 100).toFixed(0)}% Win Rate`
                              : 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Team Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-accent" />
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                title: 'Excellence', 
                icon: '🎯',
                desc: 'Striving for the highest standards in every aspect of the game, from technique to strategy.' 
              },
              { 
                title: 'Sportsmanship', 
                icon: '🤝',
                desc: 'Playing with integrity, respect for opponents, and upholding the spirit of cricket.' 
              },
              { 
                title: 'Teamwork', 
                icon: '💪',
                desc: 'United as one team, supporting each other on and off the field to achieve our goals.' 
              },
            ].map((value, index) => (
              <Card key={value.title} variant="elevated">
                <CardContent className="p-6 text-center">
                  <span className="text-5xl mb-4 block">{value.icon}</span>
                  <h3 className="font-bold text-xl mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default TeamProfile;