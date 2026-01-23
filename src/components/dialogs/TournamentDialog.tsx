import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export interface TournamentFormData {
  id?: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  venue: string;
  tournament_type: string;
  is_active: boolean;
}

interface TournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TournamentFormData) => Promise<void>;
  tournament?: {
    id: number;
    name: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    venue: string | null;
    tournament_type: string | null;
    is_active: boolean;
  };
  saving?: boolean;
}

export function TournamentDialog({ open, onOpenChange, onSave, tournament, saving }: TournamentDialogProps) {
  const [formData, setFormData] = useState<TournamentFormData>({
    name: '',
    description: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    venue: '',
    tournament_type: 'league',
    is_active: false,
  });

  useEffect(() => {
    if (tournament) {
      setFormData({
        id: tournament.id,
        name: tournament.name,
        description: tournament.description || '',
        start_date: tournament.start_date || format(new Date(), 'yyyy-MM-dd'),
        end_date: tournament.end_date || format(new Date(), 'yyyy-MM-dd'),
        venue: tournament.venue || '',
        tournament_type: tournament.tournament_type || 'league',
        is_active: tournament.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        venue: '',
        tournament_type: 'league',
        is_active: false,
      });
    }
  }, [tournament, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {tournament ? 'Edit Tournament' : 'Add New Tournament'}
          </DialogTitle>
          <DialogDescription>
            {tournament ? 'Update tournament details' : 'Create a new tournament to group matches'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Summer League 2025"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Annual summer cricket tournament..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              placeholder="Main Cricket Ground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tournament_type">Tournament Type</Label>
            <Select
              value={formData.tournament_type}
              onValueChange={(value) => setFormData({ ...formData, tournament_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="league">League</SelectItem>
                <SelectItem value="knockout">Knockout</SelectItem>
                <SelectItem value="group_stage">Group Stage</SelectItem>
                <SelectItem value="friendly">Friendly Series</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active" className="cursor-pointer">Active Tournament</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : tournament ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
