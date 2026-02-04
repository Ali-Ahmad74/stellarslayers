import { forwardRef, useMemo } from "react";
import { Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

type CardFormat = "story" | "square" | "wide";

export interface SeriesHighlightsStanding {
  played: number;
  won: number;
  lost: number;
  tied: number;
  other: number;
}

export interface SeriesHighlightRow {
  player_id: number;
  player_name: string;
  photo_url: string | null;
  value: number;
}

export interface ShareableSeriesHighlightsCardProps {
  format?: CardFormat;
  teamName?: string;
  teamLogoUrl?: string | null;
  watermarkEnabled?: boolean;
  watermarkHandle?: string | null;
  watermarkPosition?: string;
  series: {
    name: string;
    venue?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  };
  standing: SeriesHighlightsStanding;
  topRuns: SeriesHighlightRow[];
  topWickets: SeriesHighlightRow[];
  topFielding: SeriesHighlightRow[];
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return null;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

function formatClass(format: CardFormat) {
  switch (format) {
    case "story":
      return "w-[420px] min-h-[760px]";
    case "wide":
      return "w-[960px] min-h-[540px]";
    default:
      return "w-[720px] min-h-[720px]";
  }
}

function TopList({ title, rows, label }: { title: string; rows: SeriesHighlightRow[]; label: string }) {
  return (
    <div className="rounded-xl border bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <ol className="mt-3 space-y-2">
        {rows.slice(0, 3).map((r, idx) => (
          <li key={`${title}-${r.player_id}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-sm font-semibold">{idx + 1}</div>
              {r.photo_url ? (
                <img src={r.photo_url} alt={`${r.player_name} profile photo`} className="h-8 w-8 rounded-full object-cover border border-border" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted border border-border" aria-hidden />
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">{r.player_name}</div>
              </div>
            </div>
            <div className="font-semibold tabular-nums">{r.value}</div>
          </li>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground">No data yet.</div>}
      </ol>
    </div>
  );
}

export const ShareableSeriesHighlightsCard = forwardRef<HTMLDivElement, ShareableSeriesHighlightsCardProps>(
  (
    {
      format = "square",
      teamName,
      teamLogoUrl,
      watermarkEnabled,
      watermarkHandle,
      watermarkPosition,
      series,
      standing,
      topRuns,
      topWickets,
      topFielding,
    },
    ref
  ) => {
    const dateRange = useMemo(() => formatDateRange(series.start_date, series.end_date), [series.start_date, series.end_date]);
    const watermark = watermarkEnabled ? (watermarkHandle || teamName || "") : "";
    const watermarkPos = watermarkPosition || "bottom-right";

    return (
      <div ref={ref} className={cn("relative rounded-2xl overflow-hidden border bg-background text-foreground p-6", formatClass(format))}>
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-primary" />
        </div>

        <header className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-wide">Series Highlights</span>
            </div>
            <h1 className="mt-2 font-display text-3xl leading-tight truncate">{series.name}</h1>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              {dateRange && <div>{dateRange}</div>}
              {series.venue && <div>{series.venue}</div>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {teamLogoUrl ? (
              <img src={teamLogoUrl} alt={`${teamName || "Team"} logo`} className="h-12 w-12 rounded-xl object-cover border border-border" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-muted border border-border" aria-hidden />
            )}
          </div>
        </header>

        <section className={cn("relative mt-6 grid gap-4", format === "wide" ? "grid-cols-4" : "grid-cols-2")}>
          <div className="rounded-xl border bg-card/60 p-4">
            <div className="text-xs text-muted-foreground">Played</div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-primary">{standing.played}</div>
          </div>
          <div className="rounded-xl border bg-card/60 p-4">
            <div className="text-xs text-muted-foreground">Record</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {standing.won}-{standing.lost}-{standing.other}
              <span className="text-xs text-muted-foreground"> (W-L-NR)</span>
            </div>
            {standing.tied > 0 && <div className="mt-1 text-xs text-muted-foreground">Tied/Draw: {standing.tied}</div>}
          </div>
          {format === "wide" && (
            <>
              <div className="rounded-xl border bg-card/60 p-4">
                <div className="text-xs text-muted-foreground">Won</div>
                <div className="mt-1 text-3xl font-bold tabular-nums">{standing.won}</div>
              </div>
              <div className="rounded-xl border bg-card/60 p-4">
                <div className="text-xs text-muted-foreground">Lost</div>
                <div className="mt-1 text-3xl font-bold tabular-nums">{standing.lost}</div>
              </div>
            </>
          )}
        </section>

        <section className={cn("relative mt-6 grid gap-4", format === "wide" ? "grid-cols-3" : "grid-cols-1")}>
          <TopList title="Most Runs" rows={topRuns} label="Runs" />
          <TopList title="Most Wickets" rows={topWickets} label="Wkts" />
          <TopList title="Best Fielding" rows={topFielding} label="Contrib." />
        </section>

        {watermark && (
          <div
            className={cn(
              "absolute text-xs text-muted-foreground/80",
              watermarkPos === "bottom-right" && "bottom-4 right-4",
              watermarkPos === "bottom-left" && "bottom-4 left-4",
              watermarkPos === "top-right" && "top-4 right-4",
              watermarkPos === "top-left" && "top-4 left-4"
            )}
          >
            {watermark}
          </div>
        )}
      </div>
    );
  }
);

ShareableSeriesHighlightsCard.displayName = "ShareableSeriesHighlightsCard";
