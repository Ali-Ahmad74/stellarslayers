import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export interface SeriesFormData {
  id?: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  is_active: boolean;
}

export interface SeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SeriesFormData) => void;
  series?: {
    id?: number;
    name: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    venue: string | null;
    is_active: boolean;
  };
  isLoading?: boolean;
}

export function SeriesDialog({ open, onOpenChange, onSave, series, isLoading }: SeriesDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [venue, setVenue] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (series) {
      setName(series.name || "");
      setDescription(series.description || "");
      setStartDate(series.start_date || "");
      setEndDate(series.end_date || "");
      setVenue(series.venue || "");
      setIsActive(Boolean(series.is_active));
    } else {
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setVenue("");
      setIsActive(false);
    }
  }, [series, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: series?.id,
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      venue: venue.trim() || null,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{series?.id ? "Edit Series" : "Add New Series"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="series-name">Name *</Label>
              <Input id="series-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="series-desc">Description</Label>
              <Textarea
                id="series-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="min-h-[100px]"
                placeholder="Optional notes about this series"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="series-start">Start date</Label>
                <Input id="series-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="series-end">End date</Label>
                <Input id="series-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="series-venue">Venue</Label>
              <Input id="series-venue" value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={100} placeholder="Optional" />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div>
                <div className="font-medium">Active</div>
                <div className="text-sm text-muted-foreground">Mark as the current active series</div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Saving..." : series?.id ? "Save Changes" : "Add Series"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
