import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TeamSettings {
  team_name: string;
  team_logo_url: string | null;
  description: string | null;
  tagline: string | null;
  watermark_enabled: boolean;
  watermark_handle: string | null;
  watermark_position: string;
}

/**
 * Fetches the current user's team settings.
 * In multi-tenant mode each user has their own team.
 */
export function useTeamSettings() {
  const { team, teamLoading } = useAuth();
  const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamSettings = useCallback(async (teamId?: string) => {
    const id = teamId ?? team?.id;
    if (!id) {
      setTeamSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("teams")
      .select("name, logo_url, description, tagline, watermark_enabled, watermark_handle, watermark_position")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setTeamSettings(null);
      setLoading(false);
      return;
    }

    if (data) {
      setTeamSettings({
        team_name: data.name,
        team_logo_url: data.logo_url,
        description: data.description,
        tagline: data.tagline,
        watermark_enabled: data.watermark_enabled,
        watermark_handle: data.watermark_handle,
        watermark_position: data.watermark_position,
      });
    } else {
      setTeamSettings(null);
    }

    setLoading(false);
  }, [team?.id]);

  useEffect(() => {
    if (!teamLoading) {
      fetchTeamSettings();
    }
  }, [fetchTeamSettings, teamLoading]);

  const updateTeamSettings = useCallback(async (patch: Partial<TeamSettings>) => {
    if (!team?.id) throw new Error("No team found");

    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.team_name !== undefined) dbPatch.name = patch.team_name;
    if (patch.team_logo_url !== undefined) dbPatch.logo_url = patch.team_logo_url;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.tagline !== undefined) dbPatch.tagline = patch.tagline;
    if (patch.watermark_enabled !== undefined) dbPatch.watermark_enabled = patch.watermark_enabled;
    if (patch.watermark_handle !== undefined) dbPatch.watermark_handle = patch.watermark_handle;
    if (patch.watermark_position !== undefined) dbPatch.watermark_position = patch.watermark_position;

    const { data, error } = await supabase
      .from("teams")
      .update(dbPatch)
      .eq("id", team.id)
      .select("name, logo_url, description, tagline, watermark_enabled, watermark_handle, watermark_position")
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setTeamSettings({
        team_name: data.name,
        team_logo_url: data.logo_url,
        description: data.description,
        tagline: data.tagline,
        watermark_enabled: data.watermark_enabled,
        watermark_handle: data.watermark_handle,
        watermark_position: data.watermark_position,
      });
    }

    return data;
  }, [team?.id]);

  return {
    teamSettings,
    loading: loading || teamLoading,
    error,
    refetch: fetchTeamSettings,
    updateTeamSettings,
  };
}
