import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Player {
  id: number;
  name: string;
}

interface WicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batsman: Player | null;
  bowler: Player | null;
  players: Player[];
  onConfirm: (wicketType: string, fielderId: number | null, runsOnWicket: number) => void;
}

const WICKET_TYPES = [
  { value: 'bowled', label: 'Bowled', needsFielder: false },
  { value: 'caught', label: 'Caught', needsFielder: true },
  { value: 'lbw', label: 'LBW', needsFielder: false },
  { value: 'runout', label: 'Run Out', needsFielder: true },
  { value: 'stumped', label: 'Stumped', needsFielder: true },
  { value: 'hitwicket', label: 'Hit Wicket', needsFielder: false },
];

export function WicketDialog({
  open,
  onOpenChange,
  batsman,
  bowler,
  players,
  onConfirm,
}: WicketDialogProps) {
  const [wicketType, setWicketType] = useState<string>('');
  const [fielderId, setFielderId] = useState<string>('');
  const [runsOnWicket, setRunsOnWicket] = useState<string>('0');

  const selectedWicketType = WICKET_TYPES.find(w => w.value === wicketType);

  const handleConfirm = () => {
    if (!wicketType) return;
    
    onConfirm(
      wicketType,
      selectedWicketType?.needsFielder ? (fielderId ? parseInt(fielderId) : null) : null,
      parseInt(runsOnWicket) || 0
    );
    
    // Reset state
    setWicketType('');
    setFielderId('');
    setRunsOnWicket('0');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wicket! 🎯</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Batsman Out */}
          <div className="bg-destructive/10 rounded-lg p-3 text-center">
            <div className="text-sm text-muted-foreground">OUT</div>
            <div className="font-bold text-lg">{batsman?.name || 'Unknown'}</div>
          </div>
          
          {/* Wicket Type */}
          <div className="space-y-2">
            <Label>How Out?</Label>
            <Select value={wicketType} onValueChange={setWicketType}>
              <SelectTrigger>
                <SelectValue placeholder="Select wicket type" />
              </SelectTrigger>
              <SelectContent>
                {WICKET_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Fielder (if needed) */}
          {selectedWicketType?.needsFielder && (
            <div className="space-y-2">
              <Label>Fielder</Label>
              <Select value={fielderId} onValueChange={setFielderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fielder" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
                    <SelectItem key={player.id} value={String(player.id)}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Runs on wicket ball (for run outs) */}
          {wicketType === 'runout' && (
            <div className="space-y-2">
              <Label>Runs scored on this ball</Label>
              <div className="flex gap-2">
                {['0', '1', '2', '3'].map(run => (
                  <Button
                    key={run}
                    variant={runsOnWicket === run ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setRunsOnWicket(run)}
                  >
                    {run}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Bowler credit */}
          {wicketType && wicketType !== 'runout' && (
            <div className="bg-muted/50 rounded-lg p-3 text-center text-sm">
              <span className="text-muted-foreground">Wicket credited to: </span>
              <span className="font-medium">{bowler?.name || 'Unknown'}</span>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleConfirm}
              disabled={!wicketType || (selectedWicketType?.needsFielder && !fielderId)}
            >
              Confirm Wicket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
