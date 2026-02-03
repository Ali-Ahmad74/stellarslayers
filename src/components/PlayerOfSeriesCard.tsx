import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp } from "lucide-react";
import { usePlayerOfSeries } from "@/hooks/usePlayerOfSeries";

interface PlayerOfSeriesCardProps {
  seriesId: number;
}

export function PlayerOfSeriesCard({ seriesId }: PlayerOfSeriesCardProps) {
  const { data, isLoading } = usePlayerOfSeries(seriesId);

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">
            <div className="h-20 w-20 rounded-full bg-muted mx-auto mb-3" />
            <div className="h-4 w-32 bg-muted mx-auto mb-2 rounded" />
            <div className="h-3 w-24 bg-muted mx-auto rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.playerOfSeries || data.leaderboard.length === 0) {
    return null;
  }

  const winner = data.leaderboard[0];
  const player = winner.player;

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="w-5 h-5 text-primary" />
          Player of the Series
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Winner */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="relative">
            {player?.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted border-2 border-primary flex items-center justify-center">
                <span className="text-xl font-bold text-muted-foreground">
                  {player?.name?.charAt(0) ?? "?"}
                </span>
              </div>
            )}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">1</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <Link to={`/player/${winner.player_id}`} className="font-semibold text-lg hover:underline">
              {player?.name ?? "Unknown"}
            </Link>
            <p className="text-sm text-muted-foreground">{player?.role ?? ""}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                {winner.total_points.toFixed(0)} pts
              </Badge>
              <Badge variant="outline">{winner.matches_played} matches</Badge>
            </div>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold tabular-nums">{winner.total_runs}</p>
            <p className="text-xs text-muted-foreground">Runs</p>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold tabular-nums">{winner.total_wickets}</p>
            <p className="text-xs text-muted-foreground">Wickets</p>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold tabular-nums">{winner.total_catches}</p>
            <p className="text-xs text-muted-foreground">Catches</p>
          </div>
        </div>

        {/* Runners up */}
        {data.leaderboard.length > 1 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Runners up</p>
            <div className="space-y-2">
              {data.leaderboard.slice(1, 4).map((entry, idx) => (
                <div key={entry.player_id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded text-xs font-medium bg-muted flex items-center justify-center">
                      {idx + 2}
                    </span>
                    {entry.player?.photo_url ? (
                      <img
                        src={entry.player.photo_url}
                        alt={entry.player.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted" />
                    )}
                    <Link
                      to={`/player/${entry.player_id}`}
                      className="text-sm font-medium truncate hover:underline"
                    >
                      {entry.player?.name ?? "Unknown"}
                    </Link>
                  </div>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {entry.total_points.toFixed(0)} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
