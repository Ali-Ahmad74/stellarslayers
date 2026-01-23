import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type OpponentStandingRow = {
  opponent: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  other: number;
};

function recordString(r: OpponentStandingRow) {
  return `${r.won}-${r.lost}-${r.other}`;
}

export function SeriesOpponentBreakdown({ rows }: { rows: OpponentStandingRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Card variant="elevated">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center">Standings by opponent</CardTitle>
        <div className="text-sm text-muted-foreground text-center">Record shown as W-L-NR</div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.opponent} className="rounded-xl border bg-card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.opponent}</div>
                <div className="text-sm text-muted-foreground">{r.played} played</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="tabular-nums">
                  {recordString(r)}
                </Badge>
                {r.tied > 0 && (
                  <Badge variant="secondary" className="tabular-nums">
                    Tied {r.tied}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
