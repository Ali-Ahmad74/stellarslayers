import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Player {
  id: number;
  name: string;
}

interface Match {
  id: number;
  match_date: string;
  venue: string | null;
}

interface PerformanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PerformanceFormData) => void;
  players: Player[];
  matches: Match[];
  isLoading?: boolean;
}

export interface PerformanceFormData {
  match_id: number;
  player_id: number;
  batting: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    out: boolean;
  };
  bowling: {
    balls: number;
    runs_conceded: number;
    wickets: number;
    maidens: number;
    wides: number;
    no_balls: number;
    fours_conceded: number;
    sixes_conceded: number;
  };
  fielding: {
    catches: number;
    runouts: number;
    stumpings: number;
    dropped_catches: number;
  };
}

export function PerformanceDialog({ open, onOpenChange, onSave, players, matches, isLoading }: PerformanceDialogProps) {
  const [matchId, setMatchId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  
  // Batting
  const [runs, setRuns] = useState(0);
  const [balls, setBalls] = useState(0);
  const [fours, setFours] = useState(0);
  const [sixes, setSixes] = useState(0);
  const [out, setOut] = useState(false);
  
  // Bowling
  const [bowlingBalls, setBowlingBalls] = useState(0);
  const [runsConceded, setRunsConceded] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [maidens, setMaidens] = useState(0);
  const [wides, setWides] = useState(0);
  const [noBalls, setNoBalls] = useState(0);
  const [foursConceded, setFoursConceded] = useState(0);
  const [sixesConceded, setSixesConceded] = useState(0);
  
  // Fielding
  const [catches, setCatches] = useState(0);
  const [runouts, setRunouts] = useState(0);
  const [stumpings, setStumpings] = useState(0);
  const [droppedCatches, setDroppedCatches] = useState(0);

  useEffect(() => {
    if (open) {
      // Reset form when opened
      setMatchId('');
      setPlayerId('');
      setRuns(0);
      setBalls(0);
      setFours(0);
      setSixes(0);
      setOut(false);
      setBowlingBalls(0);
      setRunsConceded(0);
      setWickets(0);
      setMaidens(0);
      setWides(0);
      setNoBalls(0);
      setFoursConceded(0);
      setSixesConceded(0);
      setCatches(0);
      setRunouts(0);
      setStumpings(0);
      setDroppedCatches(0);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId || !playerId) return;
    
    onSave({
      match_id: parseInt(matchId),
      player_id: parseInt(playerId),
      batting: { runs, balls, fours, sixes, out },
      bowling: { 
        balls: bowlingBalls, 
        runs_conceded: runsConceded, 
        wickets,
        maidens,
        wides,
        no_balls: noBalls,
        fours_conceded: foursConceded,
        sixes_conceded: sixesConceded,
      },
      fielding: { catches, runouts, stumpings, dropped_catches: droppedCatches },
    });
  };

  const sortedMatches = [...matches].sort((a, b) => 
    new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  );

  // Auto-detect milestones for display
  const getMilestones = () => {
    const milestones = [];
    if (runs >= 100) milestones.push({ label: 'Century!', color: 'bg-yellow-500' });
    else if (runs >= 50) milestones.push({ label: '50+', color: 'bg-emerald-500' });
    else if (runs >= 30) milestones.push({ label: '30+', color: 'bg-blue-500' });
    if (wickets >= 5) milestones.push({ label: '5-fer!', color: 'bg-red-500' });
    else if (wickets >= 3) milestones.push({ label: '3-fer', color: 'bg-orange-500' });
    return milestones;
  };

  const milestones = getMilestones();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            Add Player Performance
            {milestones.map((m, i) => (
              <Badge key={i} className={`${m.color} text-white`}>{m.label}</Badge>
            ))}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Match *</Label>
                <Select value={matchId} onValueChange={setMatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select match" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedMatches.map((match) => (
                      <SelectItem key={match.id} value={match.id.toString()}>
                        {new Date(match.match_date).toLocaleDateString()} - {match.venue || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Player *</Label>
                <Select value={playerId} onValueChange={setPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="batting" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="batting">🏏 Batting</TabsTrigger>
                <TabsTrigger value="bowling">🎯 Bowling</TabsTrigger>
                <TabsTrigger value="fielding">🧤 Fielding</TabsTrigger>
              </TabsList>

              <TabsContent value="batting" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="runs">Runs</Label>
                    <Input
                      id="runs"
                      type="number"
                      min={0}
                      value={runs}
                      onChange={(e) => setRuns(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balls">Balls Faced</Label>
                    <Input
                      id="balls"
                      type="number"
                      min={0}
                      value={balls}
                      onChange={(e) => setBalls(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fours">Fours</Label>
                    <Input
                      id="fours"
                      type="number"
                      min={0}
                      value={fours}
                      onChange={(e) => setFours(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sixes">Sixes</Label>
                    <Input
                      id="sixes"
                      type="number"
                      min={0}
                      value={sixes}
                      onChange={(e) => setSixes(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="out"
                    checked={out}
                    onCheckedChange={(checked) => setOut(checked as boolean)}
                  />
                  <Label htmlFor="out" className="cursor-pointer">Out</Label>
                </div>
              </TabsContent>

              <TabsContent value="bowling" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bowlingBalls">Balls Bowled</Label>
                    <Input
                      id="bowlingBalls"
                      type="number"
                      min={0}
                      value={bowlingBalls}
                      onChange={(e) => setBowlingBalls(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="runsConceded">Runs Conceded</Label>
                    <Input
                      id="runsConceded"
                      type="number"
                      min={0}
                      value={runsConceded}
                      onChange={(e) => setRunsConceded(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wickets">Wickets</Label>
                    <Input
                      id="wickets"
                      type="number"
                      min={0}
                      value={wickets}
                      onChange={(e) => setWickets(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maidens">Maidens</Label>
                    <Input
                      id="maidens"
                      type="number"
                      min={0}
                      value={maidens}
                      onChange={(e) => setMaidens(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wides">Wides</Label>
                    <Input
                      id="wides"
                      type="number"
                      min={0}
                      value={wides}
                      onChange={(e) => setWides(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noBalls">No-Balls</Label>
                    <Input
                      id="noBalls"
                      type="number"
                      min={0}
                      value={noBalls}
                      onChange={(e) => setNoBalls(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="foursConceded">Fours Conceded</Label>
                    <Input
                      id="foursConceded"
                      type="number"
                      min={0}
                      value={foursConceded}
                      onChange={(e) => setFoursConceded(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sixesConceded">Sixes Conceded</Label>
                    <Input
                      id="sixesConceded"
                      type="number"
                      min={0}
                      value={sixesConceded}
                      onChange={(e) => setSixesConceded(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fielding" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="catches">Catches</Label>
                    <Input
                      id="catches"
                      type="number"
                      min={0}
                      value={catches}
                      onChange={(e) => setCatches(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="runouts">Run Outs</Label>
                    <Input
                      id="runouts"
                      type="number"
                      min={0}
                      value={runouts}
                      onChange={(e) => setRunouts(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stumpings">Stumpings</Label>
                    <Input
                      id="stumpings"
                      type="number"
                      min={0}
                      value={stumpings}
                      onChange={(e) => setStumpings(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="droppedCatches" className="text-destructive">Dropped Catches</Label>
                    <Input
                      id="droppedCatches"
                      type="number"
                      min={0}
                      value={droppedCatches}
                      onChange={(e) => setDroppedCatches(parseInt(e.target.value) || 0)}
                      className="border-destructive/50"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !matchId || !playerId}>
              {isLoading ? 'Saving...' : 'Save Performance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
