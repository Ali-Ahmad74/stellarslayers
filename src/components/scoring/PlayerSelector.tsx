import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search } from 'lucide-react';

interface Player {
  id: number;
  name: string;
  photo_url?: string | null;
  role?: string;
}

interface PlayerSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  players: Player[];
  excludeIds?: number[];
  onSelect: (player: Player) => void;
}

export function PlayerSelector({
  open,
  onOpenChange,
  title,
  players,
  excludeIds = [],
  onSelect,
}: PlayerSelectorProps) {
  const [search, setSearch] = useState('');
  
  const filteredPlayers = players.filter(p => 
    !excludeIds.includes(p.id) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (player: Player) => {
    onSelect(player);
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {filteredPlayers.map(player => (
              <Button
                key={player.id}
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => handleSelect(player)}
              >
                <PlayerAvatar
                  name={player.name}
                  photoUrl={player.photo_url}
                  size="sm"
                />
                <div className="ml-3 text-left">
                  <div className="font-medium">{player.name}</div>
                  {player.role && (
                    <div className="text-xs text-muted-foreground">{player.role}</div>
                  )}
                </div>
              </Button>
            ))}
            
            {filteredPlayers.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No players found
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
