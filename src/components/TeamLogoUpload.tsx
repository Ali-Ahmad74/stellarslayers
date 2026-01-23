import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface TeamLogoUploadProps {
  currentLogoUrl: string | null;
  onLogoChange: (url: string) => void;
  isAdmin: boolean;
}

export const TeamLogoUpload = ({ currentLogoUrl, onLogoChange, isAdmin }: TeamLogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Upload to player-photos bucket (already public)
      const fileExt = file.name.split('.').pop();
      const fileName = `team-logo-${Date.now()}.${fileExt}`;
      const filePath = `team/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(filePath);

      // Update team_settings table
      const { error: updateError } = await supabase
        .from('team_settings')
        .update({ team_logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', 1);

      if (updateError) throw updateError;

      onLogoChange(publicUrl);
      toast.success('Team logo updated successfully!');
    } catch (error) {
      // Error logged only in development to prevent information leakage
      if (import.meta.env.DEV) console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo. Make sure you have admin access.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
        {currentLogoUrl ? (
          <img 
            src={currentLogoUrl} 
            alt="Team Logo" 
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl">🏏</span>
        )}
      </div>

      {isAdmin && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </Button>
        </>
      )}
    </div>
  );
};
