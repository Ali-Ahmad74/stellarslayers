import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeamSettings {
  team_name: string;
  team_logo_url: string | null;
  description: string | null;
  watermark_enabled: boolean;
  watermark_handle: string | null;
  watermark_position: string;
}

/**
 * Fetches the single team_settings row (id=1).
 * 
 * Note: This app is designed around a single-team setup.
 */
export function useTeamSettings() {
  const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Use the secure public view that excludes admin_owner_user_id
    const { data, error } = await supabase
      .from("team_settings_public")
      .select("team_name, team_logo_url, description, watermark_enabled, watermark_handle, watermark_position")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setTeamSettings(null);
      setLoading(false);
      return;
    }

    setTeamSettings(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTeamSettings();
  }, [fetchTeamSettings]);

  // Keep branding in-sync across the app when admins update it (logo/name/description).
  useEffect(() => {
    const channel = supabase
      .channel('team-settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_settings' },
        () => {
          fetchTeamSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeamSettings]);

  const updateTeamSettings = useCallback(async (patch: Partial<TeamSettings>) => {
    const { data, error } = await supabase
      .from("team_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select("team_name, team_logo_url, description, watermark_enabled, watermark_handle, watermark_position")
      .maybeSingle();

    if (error) throw error;
    setTeamSettings(data ?? null);
    return data ?? null;
  }, []);

  return {
    teamSettings,
    loading,
    error,
    refetch: fetchTeamSettings,
    updateTeamSettings,
  };
}
