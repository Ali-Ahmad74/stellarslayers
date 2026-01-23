import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Trophy, Loader2 } from "lucide-react";

interface Series {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  is_active: boolean;
}

interface MatchLite {
  id: number;
  series_id: number | null;
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

export default function SeriesList() {
  const [series, setSeries] = useState<Series[]>([]);
  const [matches, setMatches] = useState<MatchLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const matchCountsBySeriesId = useMemo(() => {
    const m = new Map<number, number>();
    for (const row of matches) {
      if (!row.series_id) continue;
      m.set(row.series_id, (m.get(row.series_id) ?? 0) + 1);
    }
    return m;
  }, [matches]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [{ data: seriesData, error: seriesError }, { data: matchesData, error: matchesError }] =
          await Promise.all([
            supabase
              .from("series")
              .select("id, name, description, start_date, end_date, venue, is_active")
              .order("is_active", { ascending: false })
              .order("start_date", { ascending: false })
              .order("created_at", { ascending: false }),
            supabase.from("matches").select("id, series_id"),
          ]);

        if (seriesError) throw seriesError;
        if (matchesError) throw matchesError;

        if (cancelled) return;
        setSeries((seriesData as any) ?? []);
        setMatches((matchesData as any) ?? []);
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
      .channel("series-list-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "series" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, fetchData)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-display text-center">
            <span className="inline-flex items-center gap-2">
              <Trophy className="w-7 h-7 text-primary" />
              Series
            </span>
          </h1>
          <p className="text-muted-foreground mb-8 text-center">
            Browse competitions and see results and leaders.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
          </Card>
        ) : series.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No series created yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {series.map((s, idx) => {
              const dateRange = formatDateRange(s.start_date, s.end_date);
              const matchCount = matchCountsBySeriesId.get(s.id) ?? 0;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card variant="elevated" className="overflow-hidden">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-xl font-display tracking-wide">
                          {s.name}
                        </CardTitle>
                        {s.is_active && <Badge>Active</Badge>}
                      </div>
                      {(dateRange || s.venue) && (
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          {dateRange && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{dateRange}</span>
                            </div>
                          )}
                          {s.venue && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{s.venue}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">{matchCount} matches</span>
                        <Link to={`/series/${s.id}`}>
                          <Button size="sm">View</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
