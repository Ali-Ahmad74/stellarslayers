import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import {
  ShareableSeriesHighlightsCard,
  type SeriesHighlightRow,
  type SeriesHighlightsStanding,
} from "@/components/ShareableSeriesHighlightsCard";
import type { TeamSettings } from "@/hooks/useTeamSettings";

type CardFormat = "story" | "square" | "wide";

function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export interface ShareSeriesHighlightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName?: string;
  teamSettings?: Partial<TeamSettings> | null;
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

export function ShareSeriesHighlightsDialog({
  open,
  onOpenChange,
  teamName,
  teamSettings,
  series,
  standing,
  topRuns,
  topWickets,
  topFielding,
}: ShareSeriesHighlightsDialogProps) {
  const [format, setFormat] = useState<CardFormat>("square");
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const filename = useMemo(() => {
    const safe = series.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");
    return `${safe || "series"}-highlights-${format}.png`;
  }, [series.name, format]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const bgVar = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
      const backgroundColor = bgVar ? `hsl(${bgVar})` : undefined;
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor,
      });
      downloadDataUrl(filename, dataUrl);
      toast.success("Series highlights downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export highlights");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Share Series Highlights</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Format:</span>
            <Select value={format} onValueChange={(v) => setFormat(v as CardFormat)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="story">Story (9:16)</SelectItem>
                <SelectItem value="square">Square (1:1)</SelectItem>
                <SelectItem value="wide">Wide (16:9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                onOpenChange(false);
              }} 
              disabled={downloading}
              type="button"
            >
              Cancel
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                handleDownload();
              }} 
              disabled={downloading}
              type="button"
            >
              {downloading ? "Preparing…" : "Download PNG"}
            </Button>
          </div>
        </div>

        {/* Hidden card for export - rendered off-screen */}
        <div className="absolute -left-[9999px] -top-[9999px]">
          <ShareableSeriesHighlightsCard
            ref={cardRef}
            format={format}
            teamName={teamName}
            teamLogoUrl={teamSettings?.team_logo_url || null}
            watermarkEnabled={teamSettings?.watermark_enabled || false}
            watermarkHandle={teamSettings?.watermark_handle || null}
            watermarkPosition={teamSettings?.watermark_position || "bottom-right"}
            series={series}
            standing={standing}
            topRuns={topRuns}
            topWickets={topWickets}
            topFielding={topFielding}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
