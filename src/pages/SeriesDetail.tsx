import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, Loader2, MapPin, Trophy, Users } from "lucide-react";

interface Series {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  is_active: boolean;
}

interface Match {
  id: number;
  match_date: string;
  venue: string | null;
  overs: number;
  opponent_name: string | null;
  our_score: number | null;
  opponent_score: number | null;
  result: string | null;
}

interface PlayerLite {
  id: number;
  name: string;
  role: string;
  photo_url: string | null;
}

type PerformerMetric = "runs" | "wickets" | "fielding";

interface PerformerRow {
  player_id: number;
  value: number;
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

function resultBadgeVariant(result: string | null) {
  // keep this in sync with existing app styles, without introducing new hard-coded colors
  if (!result) return "secondary" as const;
  if (result === "Won") return "default" as const;
  return "secondary" as const;
}

function computeStanding(matches: Match[]) {
  const played = matches.length;
  const won = matches.filter((m) => m.result === "Won").length;
  const lost = matches.filter((m) => m.result === "Lost").length;
  const tied = matches.filter((m) => m.result === "Tied" || m.result === "Draw").length;
  const other = played - won - lost - tied;
  return { played, won, lost, tied, other };
}

function PerformerCard({
  title,
  icon,
  rows,
  playersById,
  metric,
}: {
  title: string;
  icon: React.ReactNode;
  rows: PerformerRow[];
  playersById: Map<number, PlayerLite>;
  metric: PerformerMetric;
}) {
  const label = metric === "runs" ? "Runs" : metric === "wickets" ? "Wickets" : "Contrib.";

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ol className="space-y-2">
            {rows.slice(0, 5).map((r, idx) => {
              const p = playersById.get(r.player_id);
              return (
                <li key={r.player_id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </span>
                    {p?.photo_url ? (
                      <img
                        src={p.photo_url}
                        alt={`${p.name} profile photo`}
                        className="h-8 w-8 rounded-full object-cover border border-border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted border border-border" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <Link to={`/player/${r.player_id}`} className="font-medium truncate hover:underline">
                        {p?.name ?? "Unknown"}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate">{p?.role ?? ""}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{r.value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default function SeriesDetail() {
  const { id } = useParams();
  const seriesId = Number(id);

  const [series, setSeries] = useState<Series | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [playersById, setPlayersById] = useState<Map<number, PlayerLite>>(new Map());
  const [topRuns, setTopRuns] = useState<PerformerRow[]>([]);
  const [topWickets, setTopWickets] = useState<PerformerRow[]>([]);
  const [topFielding, setTopFielding] = useState<PerformerRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const standing = useMemo(() => computeStanding(matches), [matches]);

  useEffect(() => {
    if (!Number.isFinite(seriesId)) {
      setError("Invalid series id");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [{ data: seriesRow, error: seriesErr }, { data: matchesData, error: matchesErr }] = await Promise.all([
          supabase
            .from("series")
            .select("id, name, description, start_date, end_date, venue, is_active")
            .eq("id", seriesId)
            .maybeSingle(),
          supabase
            .from("matches")
            .select("id, match_date, venue, overs, opponent_name, our_score, opponent_score, result")
            .eq("series_id", seriesId)
            .order("match_date", { ascending: false }),
        ]);

        if (seriesErr) throw seriesErr;
        if (matchesErr) throw matchesErr;
        if (!seriesRow) throw new Error("Series not found");

        const list = ((matchesData as any) ?? []) as Match[];
        const matchIds = list.map((m) => m.id);

        // Top performers (only if there are matches)
        let runsAgg = new Map<number, number>();
        let wkAgg = new Map<number, number>();
        let fieldAgg = new Map<number, number>();

        if (matchIds.length > 0) {
          const [{ data: bat }, { data: bowl }, { data: field }] = await Promise.all([
            supabase.from("batting_inputs").select("player_id, runs").in("match_id", matchIds),
            supabase.from("bowling_inputs").select("player_id, wickets").in("match_id", matchIds),
            supabase
              .from("fielding_inputs")
              .select("player_id, catches, runouts, stumpings")
              .in("match_id", matchIds),
          ]);

          for (const r of (bat as any) ?? []) {
            runsAgg.set(r.player_id, (runsAgg.get(r.player_id) ?? 0) + Number(r.runs ?? 0));
          }
          for (const r of (bowl as any) ?? []) {
            wkAgg.set(r.player_id, (wkAgg.get(r.player_id) ?? 0) + Number(r.wickets ?? 0));
          }
          for (const r of (field as any) ?? []) {
            const val = Number(r.catches ?? 0) + Number(r.runouts ?? 0) + Number(r.stumpings ?? 0);
            fieldAgg.set(r.player_id, (fieldAgg.get(r.player_id) ?? 0) + val);
          }
        }

        const toRows = (m: Map<number, number>): PerformerRow[] =>
          [...m.entries()]
            .map(([player_id, value]) => ({ player_id, value }))
            .filter((r) => r.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        const runsRows = toRows(runsAgg);
        const wicketsRows = toRows(wkAgg);
        const fieldRows = toRows(fieldAgg);

        const playerIds = Array.from(
          new Set([
            ...runsRows.map((r) => r.player_id),
            ...wicketsRows.map((r) => r.player_id),
            ...fieldRows.map((r) => r.player_id),
          ])
        );

        let playersMap = new Map<number, PlayerLite>();
        if (playerIds.length > 0) {
          const { data: playersData, error: playersErr } = await supabase
            .from("players")
            .select("id, name, role, photo_url")
            .in("id", playerIds);
          if (playersErr) throw playersErr;
          for (const p of (playersData as any) ?? []) {
            playersMap.set(p.id, p);
          }
        }

        if (cancelled) return;
        setSeries(seriesRow as any);
        setMatches(list);
        setTopRuns(runsRows);
        setTopWickets(wicketsRows);
        setTopFielding(fieldRows);
        setPlayersById(playersMap);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load series");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`series-detail-${seriesId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "series" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "batting_inputs" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "bowling_inputs" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "fielding_inputs" }, fetchData)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [seriesId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 md:py-12">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive font-medium">{error ?? "Series not found"}</p>
              <div className="mt-4">
                <Link to="/series">
                  <Button variant="outline">Back to Series</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const dateRange = formatDateRange(series.start_date, series.end_date);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8 md:py-12 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/series">
            <Button variant="outline" size="sm" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          {series.is_active && <Badge>Active</Badge>}
        </div>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-display">
            <span className="inline-flex items-center gap-2">
              <Trophy className="w-7 h-7 text-primary" />
              {series.name}
            </span>
          </h1>
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            {dateRange && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{dateRange}</span>
              </div>
            )}
            {series.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{series.venue}</span>
              </div>
            )}
          </div>
          {series.description && <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">{series.description}</p>}
        </motion.section>

        {/* Standings */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary tabular-nums">{standing.played}</p>
              <p className="text-sm text-muted-foreground">Played</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground tabular-nums">{standing.won}</p>
              <p className="text-sm text-muted-foreground">Won</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground tabular-nums">{standing.lost}</p>
              <p className="text-sm text-muted-foreground">Lost</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground tabular-nums">{standing.tied}</p>
              <p className="text-sm text-muted-foreground">Tied/Draw</p>
            </CardContent>
          </Card>
          <Card variant="stat" className="col-span-2 md:col-span-1">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground tabular-nums">{standing.other}</p>
              <p className="text-sm text-muted-foreground">No Result</p>
            </CardContent>
          </Card>
        </section>

        {/* Top Performers */}
        <section className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <h2 className="text-lg font-semibold text-foreground">Top performers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PerformerCard
              title="Most Runs"
              icon={<span aria-hidden>🏏</span>}
              rows={topRuns}
              playersById={playersById}
              metric="runs"
            />
            <PerformerCard
              title="Most Wickets"
              icon={<span aria-hidden>🎯</span>}
              rows={topWickets}
              playersById={playersById}
              metric="wickets"
            />
            <PerformerCard
              title="Best Fielding"
              icon={<span aria-hidden>🧤</span>}
              rows={topFielding}
              playersById={playersById}
              metric="fielding"
            />
          </div>
        </section>

        {/* Matches */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground text-center">Matches</h2>
          {matches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">No matches in this series yet.</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {matches.map((m, idx) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card variant="elevated">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {m.opponent_name ? `vs ${m.opponent_name}` : "Match"}
                          </div>
                          <div className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(m.match_date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            {m.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">{m.venue}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {m.our_score !== null && m.opponent_score !== null && (
                            <div className="text-right">
                              <div className="font-bold text-lg tabular-nums">{m.our_score} - {m.opponent_score}</div>
                              <div className="text-xs text-muted-foreground">{m.overs} overs</div>
                            </div>
                          )}
                          {m.result && <Badge variant={resultBadgeVariant(m.result)}>{m.result}</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
