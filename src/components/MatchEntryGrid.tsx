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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, RotateCcw, RotateCw, BookmarkPlus, Upload } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useBulkEntrySettings } from "@/hooks/useBulkEntrySettings";
import { BulkEntrySettingsDialog } from "@/components/BulkEntrySettingsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
type Player = { id: number; name: string };
type Match = { id: number; match_date: string; venue: string | null };

type MatchTemplate = {
  id: string;
  name: string;
  player_ids: number[];
};

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
      dismissal_type: z.string().nullable().optional(),
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
      dot_balls: int0,
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

type BattingStatus = "dnb" | "not_out" | "out";
type DismissalType = "caught" | "bowled" | "run_out" | "stumped" | "lbw" | "hit_wicket" | "retired" | "other";

type DraftRow = {
  include: boolean;
  batting: { runs: string; balls: string; fours: string; sixes: string; status: BattingStatus; dismissal_type: DismissalType | null };
  bowling: {
    balls: string;
    runs_conceded: string;
    wickets: string;
    maidens: string;
    wides: string;
    no_balls: string;
    fours_conceded: string;
    sixes_conceded: string;
    dot_balls: string;
  };
  fielding: { catches: string; runouts: string; stumpings: string; dropped_catches: string };
};

function emptyDraftRow(): DraftRow {
  return {
    include: false,
    batting: { runs: "0", balls: "0", fours: "0", sixes: "0", status: "dnb", dismissal_type: null },
    bowling: {
      balls: "0",
      runs_conceded: "0",
      wickets: "0",
      maidens: "0",
      wides: "0",
      no_balls: "0",
      fours_conceded: "0",
      sixes_conceded: "0",
      dot_balls: "0",
    },
    fielding: { catches: "0", runouts: "0", stumpings: "0", dropped_catches: "0" },
  };
}

type ValidationIssue = {
  playerId: number;
  playerName: string;
  category: "batting" | "bowling" | "fielding";
  severity: "warning" | "error";
  message: string;
  quickFix?: () => void;
  quickFixLabel?: string;
};

export function MatchEntryGrid({ players, matches }: { players: Player[]; matches: Match[] }) {
  const gridHotkeysRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isPasting, setIsPasting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Centralized settings
  const { settings, updateSettings } = useBulkEntrySettings();
  const { 
    autoScrollEnabled, 
    showOnlySelected, 
    showWarnings, 
    defaultSelectAll,
    confirmBeforeSave,
    clearAfterSave 
  } = settings;

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()),
    [matches],
  );

  const [matchId, setMatchId] = useState<string>(sortedMatches[0]?.id ? String(sortedMatches[0].id) : "");

  const currentMatchIndex = useMemo(() => {
    return sortedMatches.findIndex((m) => String(m.id) === matchId);
  }, [sortedMatches, matchId]);

  const handlePrevMatch = () => {
    if (currentMatchIndex > 0) {
      setMatchId(String(sortedMatches[currentMatchIndex - 1].id));
    }
  };

  const handleNextMatch = () => {
    if (currentMatchIndex < sortedMatches.length - 1) {
      setMatchId(String(sortedMatches[currentMatchIndex + 1].id));
    }
  };

  const getFieldFromColumnIndex = (colIdx: number): { category: "batting" | "bowling" | "fielding"; field: string } | null => {
    if (colIdx === 0) return { category: "batting", field: "runs" };
    if (colIdx === 1) return { category: "batting", field: "balls" };
    if (colIdx === 2) return { category: "batting", field: "fours" };
    if (colIdx === 3) return { category: "batting", field: "sixes" };
    if (colIdx === 4) return null; // out checkbox
    if (colIdx === 5) return { category: "bowling", field: "balls" };
    if (colIdx === 6) return { category: "bowling", field: "runs_conceded" };
    if (colIdx === 7) return { category: "bowling", field: "wickets" };
    if (colIdx === 8) return { category: "bowling", field: "maidens" };
    if (colIdx === 9) return { category: "bowling", field: "dot_balls" };
    if (colIdx === 10) return { category: "bowling", field: "wides" };
    if (colIdx === 11) return { category: "bowling", field: "no_balls" };
    if (colIdx === 12) return { category: "bowling", field: "fours_conceded" };
    if (colIdx === 13) return { category: "bowling", field: "sixes_conceded" };
    if (colIdx === 14) return { category: "fielding", field: "catches" };
    if (colIdx === 15) return { category: "fielding", field: "runouts" };
    if (colIdx === 16) return { category: "fielding", field: "stumpings" };
    if (colIdx === 17) return { category: "fielding", field: "dropped_catches" };
    return null;
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const activeElement = document.activeElement;
    if (!activeElement || activeElement.tagName !== "INPUT") return;

    let focusedPlayerId: number | null = null;
    let focusedColIdx: number | null = null;
    for (const [key, el] of Object.entries(inputRefs.current)) {
      if (el === activeElement) {
        const [pid, col] = key.split(":");
        focusedPlayerId = Number(pid);
        focusedColIdx = Number(col);
        break;
      }
    }

    if (focusedPlayerId === null || focusedColIdx === null) return;

    e.preventDefault();
    setIsPasting(true);

    try {
      const text = e.clipboardData.getData("text");
      if (!text) return;

      const rows = text.trim().split("\n").map((row) => row.split("\t"));
      
      if (rows.length === 1 && rows[0].length === 1) {
        const value = rows[0][0];
        const fieldInfo = getFieldFromColumnIndex(focusedColIdx);
        if (!fieldInfo) return;

        const { category, field } = fieldInfo;
        setRows((prev) => ({
          ...prev,
          [focusedPlayerId]: {
            ...prev[focusedPlayerId],
            [category]: { ...prev[focusedPlayerId][category], [field]: value },
          },
        }));
        return;
      }

      const startPlayerIndex = displayedPlayers.findIndex((p) => p.id === focusedPlayerId);
      if (startPlayerIndex === -1) return;

      setRows((prev) => {
        const next = { ...prev };
        
        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
          const targetPlayerIndex = startPlayerIndex + rowIdx;
          if (targetPlayerIndex >= displayedPlayers.length) break;

          const targetPlayer = displayedPlayers[targetPlayerIndex];
          const rowData = rows[rowIdx];

          if (!next[targetPlayer.id].include) {
            next[targetPlayer.id] = { ...next[targetPlayer.id], include: true };
          }

          for (let colIdx = 0; colIdx < rowData.length; colIdx++) {
            const targetColIdx = focusedColIdx + colIdx;
            const value = rowData[colIdx];
            
            const fieldInfo = getFieldFromColumnIndex(targetColIdx);
            if (!fieldInfo) continue;

            const { category, field } = fieldInfo;
            next[targetPlayer.id] = {
              ...next[targetPlayer.id],
              [category]: { ...next[targetPlayer.id][category], [field]: value },
            };
          }
        }
        
        return next;
      });

      toast.success(`Pasted ${rows.length} row(s) × ${rows[0].length} column(s)`);
    } catch (error) {
      console.error("Paste error:", error);
      toast.error("Failed to paste data");
    } finally {
      setIsPasting(false);
    }
  };

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

  const initialRows = useMemo(() => {
    const init: Record<number, DraftRow> = {};
    for (const p of players) {
      const row = emptyDraftRow();
      row.include = defaultSelectAll;
      init[p.id] = row;
    }
    return init;
  }, [players, defaultSelectAll]);

  const {
    state: rows,
    set: setRows,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<Record<number, DraftRow>>(initialRows, 20);

  // Ctrl/Cmd+Z and Ctrl/Cmd+Y hotkeys while focus is inside the grid
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      if (!gridHotkeysRef.current) return;

      const active = document.activeElement;
      if (!active || !gridHotkeysRef.current.contains(active)) return;

      const key = e.key.toLowerCase();
      const isUndo = key === "z" && !e.shiftKey;
      const isRedo = key === "y" || (key === "z" && e.shiftKey);

      if (isUndo) {
        if (!canUndo) return;
        e.preventDefault();
        undo();
        return;
      }
      if (isRedo) {
        if (!canRedo) return;
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // Templates
  const [templates, setTemplates] = useState<MatchTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const { data, error } = await supabase
        .from("match_templates")
        .select("id,name,player_ids")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setTemplates((data as MatchTemplate[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    void fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTemplate = () => {
    if (!templateId) {
      toast.error("Select a template first");
      return;
    }
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) {
      toast.error("Template not found");
      return;
    }

    const setIds = new Set<number>(tmpl.player_ids || []);
    setRows((prev) => {
      const next: Record<number, DraftRow> = { ...prev };
      for (const p of players) {
        next[p.id] = { ...prev[p.id], include: setIds.has(p.id) };
      }
      return next;
    });
    toast.success(`Loaded template: ${tmpl.name}`);
  };

  const saveTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      toast.error("Template name is required");
      return;
    }

    const playerIds = players
      .filter((p) => rows[p.id]?.include)
      .map((p) => p.id);

    if (playerIds.length === 0) {
      toast.error("Select at least 1 player");
      return;
    }

    try {
      const { error } = await supabase
        .from("match_templates")
        .upsert(
          [{ name, player_ids: playerIds }],
          {
            onConflict: "name",
          },
        );
      if (error) throw error;

      toast.success("Template saved");
      setTemplateName("");
      await fetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save template");
    }
  };

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
      if (r.batting.status === "out") outs += 1;

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

  const displayedPlayers = useMemo(() => {
    if (!showOnlySelected) return players;
    return players.filter((p) => rows[p.id]?.include);
  }, [players, rows, showOnlySelected]);

  const validationIssues = useMemo<ValidationIssue[]>(() => {
    const issues: ValidationIssue[] = [];

    for (const p of displayedPlayers) {
      const r = rows[p.id];
      if (!r?.include) continue;

      const runs = toInt(r.batting.runs);
      const balls = toInt(r.batting.balls);
      const fours = toInt(r.batting.fours);
      const sixes = toInt(r.batting.sixes);

      // Batting validations
      if (runs > 0 && balls === 0) {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          category: "batting",
          severity: "error",
          message: `${p.name}: Runs (${runs}) without balls faced`,
          quickFix: () => {
            setRows((prev) => ({
              ...prev,
              [p.id]: {
                ...prev[p.id],
                batting: { ...prev[p.id].batting, balls: String(runs) },
              },
            }));
          },
          quickFixLabel: "Set balls = runs",
        });
      }

      if (balls > 0 && runs > balls) {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          category: "batting",
          severity: "warning",
          message: `${p.name}: Runs (${runs}) > Balls (${balls})`,
        });
      }

      if (balls > 0) {
        const sr = (runs / balls) * 100;
        if (sr > 300) {
          issues.push({
            playerId: p.id,
            playerName: p.name,
            category: "batting",
            severity: "warning",
            message: `${p.name}: Very high strike rate (${sr.toFixed(1)})`,
          });
        }
      }

      if (fours + sixes > runs) {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          category: "batting",
          severity: "error",
          message: `${p.name}: Boundary runs (${fours * 4 + sixes * 6}) exceed total runs (${runs})`,
        });
      }

      // Bowling validations
      const bowlBalls = toInt(r.bowling.balls);
      const runsConceded = toInt(r.bowling.runs_conceded);
      const wickets = toInt(r.bowling.wickets);

      if (bowlBalls > 0) {
        const overs = bowlBalls / 6;
        const economy = overs > 0 ? runsConceded / overs : 0;
        if (economy > 25) {
          issues.push({
            playerId: p.id,
            playerName: p.name,
            category: "bowling",
            severity: "warning",
            message: `${p.name}: Very high economy rate (${economy.toFixed(1)})`,
          });
        }
      }

      if (runsConceded > 0 && bowlBalls === 0) {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          category: "bowling",
          severity: "error",
          message: `${p.name}: Runs conceded (${runsConceded}) without balls bowled`,
        });
      }
    }

    return issues;
  }, [displayedPlayers, rows]);

  const errorCount = validationIssues.filter((i) => i.severity === "error").length;
  const warningCount = validationIssues.filter((i) => i.severity === "warning").length;
  
  const displayedIssues = useMemo(() => {
    if (showWarnings) return validationIssues;
    return validationIssues.filter((i) => i.severity === "error");
  }, [validationIssues, showWarnings]);

  const handleToggleAll = (include: boolean) => {
    setRows((prev) => {
      const next: Record<number, DraftRow> = {};
      for (const [k, v] of Object.entries(prev)) next[Number(k)] = { ...v, include };
      return next;
    });
  };

  const clearGrid = () => {
    setRows((prev) => {
      const next: Record<number, DraftRow> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[Number(k)] = { ...emptyDraftRow(), include: v.include };
      }
      return next;
    });
  };

  const performSave = async () => {
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
            out: r.batting.status === "out",
            dismissal_type: r.batting.status === "out" ? (r.batting.dismissal_type || null) : null,
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
            dot_balls: toInt(r.bowling.dot_balls),
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

    // Skip validation - save as-is

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("bulk-upsert-performances", {
        body: payload,
      });
      if (error) throw error;
      toast.success("Saved match performances");
      
      // Clear grid after successful save if setting is enabled
      if (clearAfterSave) {
        clearGrid();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
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

    if (confirmBeforeSave) {
      setShowConfirmDialog(true);
    } else {
      performSave();
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
    <div ref={gridHotkeysRef}>
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Bulk Match Entry (Grid)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Match</Label>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handlePrevMatch}
                      disabled={currentMatchIndex <= 0}
                      className="shrink-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {currentMatchIndex > 0 && sortedMatches[currentMatchIndex - 1] ? (
                      <div>
                        <div className="font-semibold">Previous Match</div>
                        <div className="text-xs">
                          {new Date(sortedMatches[currentMatchIndex - 1].match_date).toLocaleDateString()}
                          {sortedMatches[currentMatchIndex - 1].venue && ` • ${sortedMatches[currentMatchIndex - 1].venue}`}
                        </div>
                      </div>
                    ) : (
                      "No previous match"
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
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

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleNextMatch}
                      disabled={currentMatchIndex >= sortedMatches.length - 1}
                      className="shrink-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {currentMatchIndex < sortedMatches.length - 1 && sortedMatches[currentMatchIndex + 1] ? (
                      <div>
                        <div className="font-semibold">Next Match</div>
                        <div className="text-xs">
                          {new Date(sortedMatches[currentMatchIndex + 1].match_date).toLocaleDateString()}
                          {sortedMatches[currentMatchIndex + 1].venue && ` • ${sortedMatches[currentMatchIndex + 1].venue}`}
                        </div>
                      </div>
                    ) : (
                      "No next match"
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
              <div className="text-sm text-muted-foreground">
                {selectedCount} of {players.length} selected
              </div>
            </div>
          </div>

          <div className="flex md:justify-end items-end">
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={undo}
                      disabled={!canUndo}
                      aria-label="Undo"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo (Ctrl/Cmd+Z)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={redo}
                      disabled={!canRedo}
                      aria-label="Redo"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo (Ctrl/Cmd+Y)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Show only selected</Label>
                <Switch checked={showOnlySelected} onCheckedChange={(v) => updateSettings({ showOnlySelected: v })} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Auto-scroll</Label>
                <Switch checked={autoScrollEnabled} onCheckedChange={(v) => updateSettings({ autoScrollEnabled: v })} />
              </div>
              <BulkEntrySettingsDialog />
              <Button onClick={handleSave} disabled={saving || selectedCount === 0 || !matchId}>
                {saving ? "Saving…" : "Save all"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Lineup template</Label>
            <div className="flex items-center gap-2">
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder={templatesLoading ? "Loading…" : "Select template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.player_ids?.length ?? 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={applyTemplate} disabled={!templateId}>
                <Upload className="h-4 w-4" />
                Load
              </Button>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Save current selection</Label>
            <div className="flex items-center gap-2">
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Top order + 4 bowlers"
              />
              <Button type="button" variant="outline" onClick={saveTemplate}>
                <BookmarkPlus className="h-4 w-4" />
                Save template
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

        {(errorCount > 0 || (showWarnings && warningCount > 0)) && (
          <Collapsible defaultOpen={errorCount > 0}>
            <Card className={errorCount > 0 ? "border-destructive" : "border-accent"}>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {errorCount > 0 ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-accent-foreground" />
                    )}
                    <CardTitle className="text-base font-display">
                      Validation Issues ({displayedIssues.length})
                    </CardTitle>
                    <div className="ml-auto flex items-center gap-2 text-xs">
                      {errorCount > 0 && (
                        <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">
                          {errorCount} error{errorCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {warningCount > 0 && (
                        <span className="px-2 py-1 rounded-full bg-accent/10 text-accent-foreground font-semibold">
                          {warningCount} warning{warningCount !== 1 ? "s" : ""}
                          {!showWarnings && " (hidden)"}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  {warningCount > 0 && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                    <Switch
                      id="show-warnings"
                      checked={showWarnings}
                      onCheckedChange={(v) => updateSettings({ showWarnings: v })}
                    />
                      <Label htmlFor="show-warnings" className="text-sm cursor-pointer">
                        Show warnings
                      </Label>
                    </div>
                  )}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {displayedIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          issue.severity === "error"
                            ? "bg-destructive/5 border-destructive/20"
                            : "bg-accent/5 border-accent/20"
                        }`}
                      >
                        {issue.severity === "error" ? (
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-accent-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{issue.message}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)}
                          </div>
                        </div>
                        {issue.quickFix && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={issue.quickFix}
                            className="shrink-0"
                          >
                            {issue.quickFixLabel}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <ScrollArea
          ref={scrollAreaRef}
          className="h-[520px] rounded-lg border border-border overscroll-contain"
          onPaste={handlePaste}
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
                <div>Status</div>
                <div>Bowl balls</div>
                <div>Runs conc</div>
                <div>Wkts</div>
                <div>Maidens</div>
                <div>Dots</div>
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

            {displayedPlayers.map((p, playerIndex) => {
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
                  <Select
                    value={r.batting.status}
                    onValueChange={(value: BattingStatus) =>
                      setRows((prev) => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], batting: { ...prev[p.id].batting, status: value, dismissal_type: value === "out" ? prev[p.id].batting.dismissal_type : null } },
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dnb">DNB</SelectItem>
                      <SelectItem value="not_out">Not Out</SelectItem>
                      <SelectItem value="out">Out</SelectItem>
                    </SelectContent>
                  </Select>
                  {r.batting.status === "out" && (
                    <Select
                      value={r.batting.dismissal_type || ""}
                      onValueChange={(value: DismissalType) =>
                        setRows((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], batting: { ...prev[p.id].batting, dismissal_type: value } },
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="How out?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="caught">Caught</SelectItem>
                        <SelectItem value="bowled">Bowled</SelectItem>
                        <SelectItem value="run_out">Run Out</SelectItem>
                        <SelectItem value="stumped">Stumped</SelectItem>
                        <SelectItem value="lbw">LBW</SelectItem>
                        <SelectItem value="hit_wicket">Hit Wicket</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* Bowling */}
                  {(
                    [
                      "balls",
                      "runs_conceded",
                      "wickets",
                      "maidens",
                      "dot_balls",
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
                        inputRefs.current[`${p.id}:${5 + i}`] = el;
                      }}
                      onFocus={() => focusCell(p.id, 5 + i)}
                      onKeyDown={(e) => handleCellKeyDown(e, playerIndex, 5 + i)}
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
                        inputRefs.current[`${p.id}:${14 + i}`] = el;
                      }}
                      onFocus={() => focusCell(p.id, 14 + i)}
                      onKeyDown={(e) => handleCellKeyDown(e, playerIndex, 14 + i)}
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to save performance data for {selectedCount} player(s). This will update the match statistics in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowConfirmDialog(false); performSave(); }}>
              Save Performances
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
