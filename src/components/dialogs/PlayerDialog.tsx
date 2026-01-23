import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayerRole } from '@/types/cricket';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (player: PlayerFormData) => void;
  player?: {
    id?: number;
    name: string;
    role: PlayerRole;
    batting_style: string | null;
    bowling_style: string | null;
    photo_url?: string | null;
  };
  isLoading?: boolean;
}

export interface PlayerFormData {
  id?: number;
  name: string;
  role: PlayerRole;
  batting_style: string | null;
  bowling_style: string | null;
  photo_url?: string | null;
}

const ROLES: PlayerRole[] = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
const BATTING_STYLES = ['Right-handed', 'Left-handed'];
const BOWLING_STYLES = ['Right-arm Fast', 'Left-arm Fast', 'Right-arm Medium', 'Left-arm Medium', 'Right-arm Off-spin', 'Right-arm Leg-spin', 'Left-arm Orthodox', 'Left-arm Chinaman', 'None'];

export function PlayerDialog({ open, onOpenChange, onSave, player, isLoading }: PlayerDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('Batsman');
  const [battingStyle, setBattingStyle] = useState('');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setRole(player.role);
      setBattingStyle(player.batting_style || '');
      setBowlingStyle(player.bowling_style || '');
      setPhotoUrl(player.photo_url || null);
    } else {
      setName('');
      setRole('Batsman');
      setBattingStyle('');
      setBowlingStyle('');
      setPhotoUrl(null);
    }
  }, [player, open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `players/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
      toast.success('Photo uploaded!');
    } catch (error) {
      // Error logged only in development to prevent information leakage
      if (import.meta.env.DEV) console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: player?.id,
      name: name.trim(),
      role,
      batting_style: battingStyle || null,
      bowling_style: bowlingStyle || null,
      photo_url: photoUrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {player?.id ? 'Edit Player' : 'Add New Player'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Player Photo</Label>
              <div className="flex items-center gap-4">
                {photoUrl ? (
                  <div className="relative">
                    <img 
                      src={photoUrl} 
                      alt="Player" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {photoUrl ? 'Change Photo' : 'Upload Photo'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Player Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter player name"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={(value) => setRole(value as PlayerRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batting">Batting Style</Label>
              <Select value={battingStyle} onValueChange={setBattingStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batting style" />
                </SelectTrigger>
                <SelectContent>
                  {BATTING_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>{style}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bowling">Bowling Style</Label>
              <Select value={bowlingStyle} onValueChange={setBowlingStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bowling style" />
                </SelectTrigger>
                <SelectContent>
                  {BOWLING_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>{style}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || uploading}>
              {isLoading ? 'Saving...' : player?.id ? 'Save Changes' : 'Add Player'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
