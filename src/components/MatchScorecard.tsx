import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export interface BattingScorecardRow {
  player_id: number;
  player_name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissal_type: string | null;
}

export interface BowlingScorecardRow {
  player_id: number;
  player_name: string;
  balls: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
  wides: number;
  no_balls: number;
}

export interface FieldingScorecardRow {
  player_id: number;
  player_name: string;
  catches: number;
  runouts: number;
  stumpings: number;
}

function formatOvers(balls: number) {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return remainingBalls > 0 ? `${overs}.${remainingBalls}` : `${overs}`;
}

export function MatchScorecard({ matchId }: { matchId: number }) {
  const [loading, setLoading] = useState(false);
  const [batting, setBatting] = useState<BattingScorecardRow[]>([]);
  const [bowling, setBowling] = useState<BowlingScorecardRow[]>([]);
  const [fielding, setFielding] = useState<FieldingScorecardRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [batRes, bowlRes, fieldRes] = await Promise.all([
          supabase
            .from("batting_inputs")
            .select("player_id, runs, balls, fours, sixes, out, dismissal_type, players(name)")
            .eq("match_id", matchId)
            .order("runs", { ascending: false }),
          supabase
            .from("bowling_inputs")
            .select("player_id, balls, runs_conceded, wickets, maidens, wides, no_balls, players(name)")
            .eq("match_id", matchId)
            .order("wickets", { ascending: false }),
          supabase
            .from("fielding_inputs")
            .select("player_id, catches, runouts, stumpings, players(name)")
            .eq("match_id", matchId),
        ]);

        if (batRes.error) throw batRes.error;
        if (bowlRes.error) throw bowlRes.error;
        if (fieldRes.error) throw fieldRes.error;

        const battingRows: BattingScorecardRow[] = (batRes.data ?? []).map((b: any) => ({
          player_id: b.player_id,
          player_name: b.players?.name || "Unknown",
          runs: Number(b.runs ?? 0),
          balls: Number(b.balls ?? 0),
          fours: Number(b.fours ?? 0),
          sixes: Number(b.sixes ?? 0),
          out: Boolean(b.out),
          dismissal_type: b.dismissal_type || null,
        }));

        const bowlingRows: BowlingScorecardRow[] = (bowlRes.data ?? []).map((b: any) => ({
          player_id: b.player_id,
          player_name: b.players?.name || "Unknown",
          balls: Number(b.balls ?? 0),
          runs_conceded: Number(b.runs_conceded ?? 0),
          wickets: Number(b.wickets ?? 0),
          maidens: Number(b.maidens ?? 0),
          wides: Number(b.wides ?? 0),
          no_balls: Number(b.no_balls ?? 0),
        }));

        const fieldingRows: FieldingScorecardRow[] = (fieldRes.data ?? [])
          .filter(
            (f: any) =>
              Number(f.catches ?? 0) > 0 || Number(f.runouts ?? 0) > 0 || Number(f.stumpings ?? 0) > 0
          )
          .map((f: any) => ({
            player_id: f.player_id,
            player_name: f.players?.name || "Unknown",
            catches: Number(f.catches ?? 0),
            runouts: Number(f.runouts ?? 0),
            stumpings: Number(f.stumpings ?? 0),
          }));

        if (cancelled) return;
        setBatting(battingRows);
        setBowling(bowlingRows);
        setFielding(fieldingRows);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load scorecard");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const isEmpty = useMemo(() => batting.length === 0 && bowling.length === 0 && fielding.length === 0, [batting, bowling, fielding]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive text-center py-4">{error}</p>;
  }

  if (isEmpty) {
    return <p className="text-center text-muted-foreground py-4">No detailed scorecard available for this match</p>;
  }

  // Separate batters who actually batted vs DNB (0 runs, 0 balls, not out)
  const actualBatters = batting.filter(b => b.balls > 0 || b.runs > 0 || b.out);
  const dnbPlayers = batting.filter(b => b.balls === 0 && b.runs === 0 && !b.out);

  return (
    <div className="p-4 space-y-6">
      {actualBatters.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">🏏 Batting Scorecard</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">R</TableHead>
                  <TableHead className="text-center">B</TableHead>
                  <TableHead className="text-center">4s</TableHead>
                  <TableHead className="text-center">6s</TableHead>
                  <TableHead className="text-center">SR</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actualBatters.map((b) => (
                  <TableRow key={b.player_id}>
                    <TableCell className="font-medium">{b.player_name}</TableCell>
                    <TableCell className="text-center font-bold">{b.runs}</TableCell>
                    <TableCell className="text-center">{b.balls}</TableCell>
                    <TableCell className="text-center">{b.fours}</TableCell>
                    <TableCell className="text-center">{b.sixes}</TableCell>
                    <TableCell className="text-center">{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0"}</TableCell>
                    <TableCell className="text-center">
                      {b.out ? (
                        <Badge variant="destructive">
                          {b.dismissal_type ? b.dismissal_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Out'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Out</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {dnbPlayers.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Did Not Bat: </span>
                {dnbPlayers.map(p => p.player_name).join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {bowling.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">🎯 Bowling Scorecard</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">O</TableHead>
                  <TableHead className="text-center">M</TableHead>
                  <TableHead className="text-center">R</TableHead>
                  <TableHead className="text-center">W</TableHead>
                  <TableHead className="text-center">Econ</TableHead>
                  <TableHead className="text-center">Extras</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bowling.map((b) => (
                  <TableRow key={b.player_id}>
                    <TableCell className="font-medium">{b.player_name}</TableCell>
                    <TableCell className="text-center">{formatOvers(b.balls)}</TableCell>
                    <TableCell className="text-center">{b.maidens}</TableCell>
                    <TableCell className="text-center">{b.runs_conceded}</TableCell>
                    <TableCell className="text-center font-bold">{b.wickets}</TableCell>
                    <TableCell className="text-center">{b.balls > 0 ? (b.runs_conceded / (b.balls / 6)).toFixed(2) : "0.00"}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {b.wides + b.no_balls > 0 ? `${b.wides}wd, ${b.no_balls}nb` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {fielding.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">🧤 Fielding Highlights</h4>
          <div className="flex flex-wrap gap-2">
            {fielding.map((f) => (
              <Badge key={f.player_id} variant="outline" className="py-2 px-3">
                {f.player_name}:{f.catches > 0 && ` ${f.catches}c`}
                {f.runouts > 0 && ` ${f.runouts}ro`}
                {f.stumpings > 0 && ` ${f.stumpings}st`}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
