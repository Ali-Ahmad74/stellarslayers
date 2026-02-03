import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { useOpponentPerformance, OpponentPerformanceRow } from "@/hooks/useOpponentPerformance";

function formatOvers(balls: number) {
  const overs = Math.floor(balls / 6);
  const remaining = balls % 6;
  return remaining > 0 ? `${overs}.${remaining}` : `${overs}`;
}

export function OpponentBreakdown({ playerId }: { playerId: number }) {
  const { data: rows, isLoading, error } = useOpponentPerformance(playerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load opponent breakdown
        </CardContent>
      </Card>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Performance vs Opponents
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No opponent data available yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Performance vs Opponents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opponent</TableHead>
                <TableHead className="text-center">M</TableHead>
                <TableHead className="text-center">Runs</TableHead>
                <TableHead className="text-center">SR</TableHead>
                <TableHead className="text-center">Wkts</TableHead>
                <TableHead className="text-center">Econ</TableHead>
                <TableHead className="text-center">Fielding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.opponent}>
                  <TableCell className="font-medium">{row.opponent}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{row.matches}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{row.runs}</TableCell>
                  <TableCell className="text-center">{row.strikeRate}</TableCell>
                  <TableCell className="text-center font-semibold">{row.wickets}</TableCell>
                  <TableCell className="text-center">
                    {row.economy !== null ? row.economy.toFixed(2) : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.catches + row.runouts + row.stumpings > 0 ? (
                      <span className="text-sm">
                        {row.catches > 0 && `${row.catches}c`}
                        {row.runouts > 0 && ` ${row.runouts}ro`}
                        {row.stumpings > 0 && ` ${row.stumpings}st`}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
