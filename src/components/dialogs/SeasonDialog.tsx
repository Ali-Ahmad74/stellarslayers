import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface SeasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (season: SeasonFormData) => void;
  season?: {
    id?: number;
    name: string;
    year: number;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
  };
  isLoading?: boolean;
}

export interface SeasonFormData {
  id?: number;
  name: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export function SeasonDialog({ open, onOpenChange, onSave, season, isLoading }: SeasonDialogProps) {
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (season) {
      setName(season.name);
      setYear(season.year);
      setStartDate(season.start_date || '');
      setEndDate(season.end_date || '');
      setIsActive(season.is_active);
    } else {
      setName('');
      setYear(new Date().getFullYear());
      setStartDate('');
      setEndDate('');
      setIsActive(false);
    }
  }, [season, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: season?.id,
      name: name.trim(),
      year,
      start_date: startDate || null,
      end_date: endDate || null,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {season?.id ? 'Edit Season' : 'Add New Season'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Season Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Summer Season 2025"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                min={2000}
                max={2100}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active Season</Label>
                <p className="text-sm text-muted-foreground">
                  Mark this as the current active season
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : season?.id ? 'Save Changes' : 'Add Season'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
