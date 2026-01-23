import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (match: MatchFormData) => void;
  match?: {
    id?: number;
    match_date: string;
    overs: number;
    venue: string | null;
    tournament_id?: number | null;
    opponent_name?: string | null;
    our_score?: number | null;
    opponent_score?: number | null;
    result?: string | null;
  };
  tournaments?: Array<{ id: number; name: string }>;
  isLoading?: boolean;
}

export interface MatchFormData {
  id?: number;
  match_date: string;
  overs: number;
  venue: string | null;
  tournament_id: number | null;
  opponent_name: string | null;
  our_score: number;
  opponent_score: number;
  result: string | null;
}

const RESULTS = ['Won', 'Lost', 'Draw', 'Tied', 'No Result'];

export function MatchDialog({ open, onOpenChange, onSave, match, tournaments = [], isLoading }: MatchDialogProps) {
  const [matchDate, setMatchDate] = useState('');
  const [overs, setOvers] = useState(20);
  const [venue, setVenue] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [ourScore, setOurScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [result, setResult] = useState('');
  const [tournamentId, setTournamentId] = useState<string>('none');

  useEffect(() => {
    if (match) {
      setMatchDate(match.match_date.split('T')[0]);
      setOvers(match.overs);
      setVenue(match.venue || '');
      setOpponentName(match.opponent_name || '');
      setOurScore(match.our_score || 0);
      setOpponentScore(match.opponent_score || 0);
      setResult(match.result || '');
      setTournamentId(match.tournament_id ? String(match.tournament_id) : 'none');
    } else {
      setMatchDate(new Date().toISOString().split('T')[0]);
      setOvers(20);
      setVenue('');
      setOpponentName('');
      setOurScore(0);
      setOpponentScore(0);
      setResult('');
      setTournamentId('none');
    }
  }, [match, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: match?.id,
      match_date: matchDate,
      overs,
      venue: venue.trim() || null,
      tournament_id: tournamentId === 'none' ? null : Number(tournamentId),
      opponent_name: opponentName.trim() || null,
      our_score: ourScore,
      opponent_score: opponentScore,
      result: result || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {match?.id ? 'Edit Match' : 'Add New Match'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Match Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overs">Overs *</Label>
                <Input
                  id="overs"
                  type="number"
                  min={1}
                  max={50}
                  value={overs}
                  onChange={(e) => setOvers(parseInt(e.target.value) || 20)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Enter venue name"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tournament">Tournament</Label>
              <Select value={tournamentId} onValueChange={setTournamentId}>
                <SelectTrigger id="tournament">
                  <SelectValue placeholder="Select tournament (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tournament</SelectItem>
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent Team</Label>
              <Input
                id="opponent"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="Enter opponent team name"
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ourScore">Our Score</Label>
                <Input
                  id="ourScore"
                  type="number"
                  min={0}
                  value={ourScore}
                  onChange={(e) => setOurScore(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opponentScore">Opponent Score</Label>
                <Input
                  id="opponentScore"
                  type="number"
                  min={0}
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="result">Match Result</Label>
              <Select value={result} onValueChange={setResult}>
                <SelectTrigger>
                  <SelectValue placeholder="Select result" />
                </SelectTrigger>
                <SelectContent>
                  {RESULTS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !matchDate}>
              {isLoading ? 'Saving...' : match?.id ? 'Save Changes' : 'Add Match'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
