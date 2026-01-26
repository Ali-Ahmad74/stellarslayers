import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Player = { id: number; name: string };
type Match = { id: number; match_date: string; venue: string | null };

const int0 = z.number().int().min(0);

const rowSchema = z.object({
  player_id: z.number().int().positive(),
  batting: z
    .object({
      runs: int0,
      balls: int0,
      fours: int0,
      sixes: int0,
      out: z.boolean(),
    })
    .optional(),
  bowling: z
    .object({
      balls: int0,
      runs_conceded: int0,
      wickets: int0,
      maidens: int0,
      wides: int0,
      no_balls: int0,
      fours_conceded: int0,
      sixes_conceded: int0,
    })
    .optional(),
  fielding: z
    .object({
      catches: int0,
      runouts: int0,
      stumpings: int0,
      dropped_catches: int0,
    })
    .optional(),
});

const payloadSchema = z.object({
  match_id: z.number().int().positive(),
  rows: z.array(rowSchema).min(1).max(30),
});

function toInt(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

type DraftRow = {
  include: boolean;
  batting: { runs: string; balls: string; fours: string; sixes: string; out: boolean };
  bowling: {
    balls: string;
    runs_conceded: string;
    wickets: string;
    maidens: string;
    wides: string;
    no_balls: string;
    fours_conceded: string;
    sixes_conceded: string;
  };
  fielding: { catches: string; runouts: string; stumpings: string; dropped_catches: string };
};

function emptyDraftRow(): DraftRow {
  return {
    include: false,
    batting: { runs: "0", balls: "0", fours: "0", sixes: "0", out: false },
    bowling: {
      balls: "0",
      runs_conceded: "0",
      wickets: "0",
      maidens: "0",
      wides: "0",
      no_balls: "0",
      fours_conceded: "0",
      sixes_conceded: "0",
    },
    fielding: { catches: "0", runouts: "0", stumpings: "0", dropped_catches: "0" },
  };
}

export function MatchEntryGrid({ players, matches }: { players: Player[]; matches: Match[] }) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("bulkGridAutoScroll");
      if (raw === null) return true;
      return raw === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("bulkGridAutoScroll", String(autoScrollEnabled));
    } catch {
      // ignore
    }
  }, [autoScrollEnabled]);

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()),
    [matches],
  );

  const [matchId, setMatchId] = useState<string>(sortedMatches[0]?.id ? String(sortedMatches[0].id) : "");

  useEffect(() => {
    // When the available match list changes (e.g., filtering by series), keep selection valid.
    if (sortedMatches.length === 0) {
      setMatchId("");
      return;
    }
    const hasSelected = sortedMatches.some((m) => String(m.id) === matchId);
    if (!hasSelected) {
      setMatchId(String(sortedMatches[0].id));
    }
  }, [sortedMatches, matchId]);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Record<number, DraftRow>>(() => {
    const init: Record<number, DraftRow> = {};
    for (const p of players) init[p.id] = emptyDraftRow();
    return init;
  });

  const selectedCount = useMemo(
    () => Object.values(rows).filter((r) => r.include).length,
    [rows],
  );

  const summary = useMemo(() => {
    let runs = 0;
    let balls = 0;
    let outs = 0;
    let fours = 0;
    let sixes = 0;
    let wickets = 0;
    let catches = 0;
    let runouts = 0;
    let wides = 0;
    let noBalls = 0;

    for (const p of players) {
      const r = rows[p.id];
      if (!r?.include) continue;

      runs += toInt(r.batting.runs);
      balls += toInt(r.batting.balls);
      fours += toInt(r.batting.fours);
      sixes += toInt(r.batting.sixes);
      if (r.batting.out) outs += 1;

      wickets += toInt(r.bowling.wickets);
      wides += toInt(r.bowling.wides);
      noBalls += toInt(r.bowling.no_balls);

      catches += toInt(r.fielding.catches);
      runouts += toInt(r.fielding.runouts);
    }

    const extras = wides + noBalls;

    return {
      runs,
      balls,
      outs,
      fours,
      sixes,
      wickets,
      catches,
      runouts,
      wides,
      noBalls,
      extras,
    };
  }, [players, rows]);

  const handleToggleAll = (include: boolean) => {
    setRows((prev) => {
      const next: Record<number, DraftRow> = {};
      for (const [k, v] of Object.entries(prev)) next[Number(k)] = { ...v, include };
      return next;
    });
  };

  const handleSave = async () => {
    const mId = Number(matchId);
    if (!mId) {
      toast.error("Select a match first");
      return;
    }

    const includedPlayers = players.filter((p) => rows[p.id]?.include);
    if (includedPlayers.length === 0) {
      toast.error("Select at least 1 player");
      return;
    }

    const payload = {
      match_id: mId,
      rows: includedPlayers.map((p) => {
        const r = rows[p.id];
        return {
          player_id: p.id,
          batting: {
            runs: toInt(r.batting.runs),
            balls: toInt(r.batting.balls),
            fours: toInt(r.batting.fours),
            sixes: toInt(r.batting.sixes),
            out: r.batting.out,
          },
          bowling: {
            balls: toInt(r.bowling.balls),
            runs_conceded: toInt(r.bowling.runs_conceded),
            wickets: toInt(r.bowling.wickets),
            maidens: toInt(r.bowling.maidens),
            wides: toInt(r.bowling.wides),
            no_balls: toInt(r.bowling.no_balls),
            fours_conceded: toInt(r.bowling.fours_conceded),
            sixes_conceded: toInt(r.bowling.sixes_conceded),
          },
          fielding: {
            catches: toInt(r.fielding.catches),
            runouts: toInt(r.fielding.runouts),
            stumpings: toInt(r.fielding.stumpings),
            dropped_catches: toInt(r.fielding.dropped_catches),
          },
        };
      }),
    };

    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Please fix invalid numbers in the grid");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("bulk-upsert-performances", {
        body: parsed.data,
      });
      if (error) throw error;
      toast.success("Saved match performances");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () =>
      [
        { group: "batting", key: "runs" as const },
        { group: "batting", key: "balls" as const },
        { group: "batting", key: "fours" as const },
        { group: "batting", key: "sixes" as const },
        { group: "bowling", key: "balls" as const },
        { group: "bowling", key: "runs_conceded" as const },
        { group: "bowling", key: "wickets" as const },
        { group: "bowling", key: "maidens" as const },
        { group: "bowling", key: "wides" as const },
        { group: "bowling", key: "no_balls" as const },
        { group: "bowling", key: "fours_conceded" as const },
        { group: "bowling", key: "sixes_conceded" as const },
        { group: "fielding", key: "catches" as const },
        { group: "fielding", key: "runouts" as const },
        { group: "fielding", key: "stumpings" as const },
        { group: "fielding", key: "dropped_catches" as const },
      ] as const,
    [],
  );

  const focusCell = (playerId: number, colIndex: number) => {
    const key = `${playerId}:${colIndex}`;
    const el = inputRefs.current[key];
    if (!el) return;

    el.focus();
    el.select?.();

    if (!autoScrollEnabled) return;

    // Horizontal auto-scroll within the scroll-area viewport (avoid scrolling the whole page)
    requestAnimationFrame(() => {
      const root = scrollAreaRef.current;
      const viewport = root?.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]");
      if (!viewport) return;

      const cellRect = el.getBoundingClientRect();
      const vpRect = viewport.getBoundingClientRect();

      const cellCenter = cellRect.left + cellRect.width / 2;
      const vpCenter = vpRect.left + vpRect.width / 2;
      const delta = cellCenter - vpCenter;

      viewport.scrollLeft += delta;
    });
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, playerIndex: number, colIndex: number) => {
    const isArrowLeft = e.key === "ArrowLeft";
    const isArrowRight = e.key === "ArrowRight";
    const isArrowUp = e.key === "ArrowUp";
    const isArrowDown = e.key === "ArrowDown";
    const isEnter = e.key === "Enter";

    if (!(isArrowLeft || isArrowRight || isArrowUp || isArrowDown || isEnter)) return;
    e.preventDefault();

    const nextCol = isArrowLeft ? colIndex - 1 : isArrowRight ? colIndex + 1 : colIndex;
    const nextRow = isEnter
      ? playerIndex + (e.shiftKey ? -1 : 1)
      : isArrowUp
        ? playerIndex - 1
        : isArrowDown
          ? playerIndex + 1
          : playerIndex;

    const boundedCol = Math.max(0, Math.min(columns.length - 1, nextCol));
    const boundedRow = Math.max(0, Math.min(players.length - 1, nextRow));

    const nextPlayerId = players[boundedRow]?.id;
    if (!nextPlayerId) return;
    focusCell(nextPlayerId, boundedCol);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Bulk Match Entry (Grid)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Match</Label>
            <Select value={matchId} onValueChange={setMatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select match" />
              </SelectTrigger>
              <SelectContent>
                {sortedMatches.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {new Date(m.match_date).toLocaleDateString()} {m.venue ? `• ${m.venue}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Squad</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => handleToggleAll(true)}>
                Select all
              </Button>
              <Button type="button" variant="outline" onClick={() => handleToggleAll(false)}>
                Clear
              </Button>
              <div className="text-sm text-muted-foreground">{selectedCount} selected</div>
            </div>
          </div>

          <div className="flex md:justify-end items-end">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Auto-scroll</Label>
                <Switch checked={autoScrollEnabled} onCheckedChange={setAutoScrollEnabled} />
              </div>
              <Button onClick={handleSave} disabled={saving || selectedCount === 0 || !matchId}>
                {saving ? "Saving…" : "Save all"}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-display">Match Summary (Live)</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div>
                <div className="text-xs text-muted-foreground">Runs</div>
                <div className="text-lg font-semibold">{summary.runs}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Balls</div>
                <div className="text-lg font-semibold">{summary.balls}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Outs</div>
                <div className="text-lg font-semibold">{summary.outs}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">4s / 6s</div>
                <div className="text-lg font-semibold">{summary.fours} / {summary.sixes}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Wickets</div>
                <div className="text-lg font-semibold">{summary.wickets}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Catches / Runouts</div>
                <div className="text-lg font-semibold">{summary.catches} / {summary.runouts}</div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Extras (derived)</div>
                <div className="text-sm text-muted-foreground">Wides + No-balls</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Wides</div>
                <div className="text-base font-semibold">{summary.wides}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">No-balls</div>
                <div className="text-base font-semibold">{summary.noBalls}</div>
              </div>
              <div className="md:col-span-3">
                <div className="text-xs text-muted-foreground">Total extras</div>
                <div className="text-lg font-semibold">{summary.extras}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ScrollArea
          ref={scrollAreaRef}
          className="h-[520px] rounded-lg border border-border overscroll-contain"
          onWheelCapture={(e) => {
            // Prevent the parent page from scrolling while using the grid.
            e.stopPropagation();
          }}
          onTouchMoveCapture={(e) => {
            // Same for touch scrolling on mobile.
            e.stopPropagation();
          }}
        >
          <div className="min-w-[1200px]">
            <div className="sticky top-0 z-20 bg-background border-b border-border">
              <div className="grid grid-cols-[240px_repeat(5,110px)_repeat(8,110px)_repeat(4,110px)] items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <div className="sticky left-0 z-20 bg-background pr-2 border-r border-border">Player</div>
                <div>Runs</div>
                <div>Balls</div>
                <div>4s</div>
                <div>6s</div>
                <div>Out</div>
                <div>Bowl balls</div>
                <div>Runs conc</div>
                <div>Wkts</div>
                <div>Maidens</div>
                <div>Wides</div>
                <div>No-balls</div>
                <div>4s conc</div>
                <div>6s conc</div>
                <div>Catches</div>
                <div>Runouts</div>
                <div>Stump</div>
                <div>Dropped</div>
              </div>
            </div>

            {players.map((p, playerIndex) => {
              const r = rows[p.id] ?? emptyDraftRow();
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[240px_repeat(5,110px)_repeat(8,110px)_repeat(4,110px)] items-center gap-2 px-3 py-2 border-b border-border"
                >
                  <div className="sticky left-0 z-10 bg-background flex items-center gap-2 pr-2 border-r border-border">
                    <Checkbox
                      checked={r.include}
                      onCheckedChange={(checked) =>
                        setRows((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], include: Boolean(checked) },
                        }))
                      }
                    />
                    <div className="text-sm font-medium truncate" title={p.name}>
                      {p.name}
                    </div>
                  </div>

                  {/* Batting */}
                  {["runs", "balls", "fours", "sixes"].map((key, idx) => (
                    <Input
                      key={`${p.id}-batting-${key}`}
                      inputMode="numeric"
                      value={(r.batting as any)[key]}
                      ref={(el) => {
                        inputRefs.current[`${p.id}:${idx}`] = el;
                      }}
                      onFocus={() => focusCell(p.id, idx)}
                      onKeyDown={(e) => handleCellKeyDown(e, playerIndex, idx)}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [p.id]: {
                            ...prev[p.id],
                            batting: { ...prev[p.id].batting, [key]: e.target.value },
                          },
                        }))
                      }
                    />
                  ))}
                  <div className="flex justify-center">
                    <Checkbox
                      checked={r.batting.out}
                      onCheckedChange={(checked) =>
                        setRows((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], batting: { ...prev[p.id].batting, out: Boolean(checked) } },
                        }))
                      }
                    />
                  </div>

                  {/* Bowling */}
                  {(
                    [
                      "balls",
                      "runs_conceded",
                      "wickets",
                      "maidens",
                      "wides",
                      "no_balls",
                      "fours_conceded",
                      "sixes_conceded",
                    ] as const
                  ).map((key, i) => (
                    <Input
                      key={`${p.id}-bowling-${key}`}
                      inputMode="numeric"
                      value={(r.bowling as any)[key]}
                      ref={(el) => {
                        inputRefs.current[`${p.id}:${4 + i}`] = el;
                      }}
                      onFocus={() => focusCell(p.id, 4 + i)}
                      onKeyDown={(e) => handleCellKeyDown(e, playerIndex, 4 + i)}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [p.id]: {
                            ...prev[p.id],
                            bowling: { ...prev[p.id].bowling, [key]: e.target.value },
                          },
                        }))
                      }
                    />
                  ))}

                  {/* Fielding */}
                  {(
                    ["catches", "runouts", "stumpings", "dropped_catches"] as const
                  ).map((key, i) => (
                    <Input
                      key={`${p.id}-fielding-${key}`}
                      inputMode="numeric"
                      value={(r.fielding as any)[key]}
                      ref={(el) => {
                        inputRefs.current[`${p.id}:${12 + i}`] = el;
                      }}
                      onFocus={() => focusCell(p.id, 12 + i)}
                      onKeyDown={(e) => handleCellKeyDown(e, playerIndex, 12 + i)}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [p.id]: {
                            ...prev[p.id],
                            fielding: { ...prev[p.id].fielding, [key]: e.target.value },
                          },
                        }))
                      }
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
