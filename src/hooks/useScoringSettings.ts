import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ScoringSettings {
  id: number;
  updated_at: string;

  batting_weight: number;
  bowling_weight: number;
  fielding_weight: number;

  batting_run_points: number;
  batting_four_points: number;
  batting_six_points: number;
  batting_thirty_bonus: number;
  batting_fifty_bonus: number;
  batting_hundred_bonus: number;
  batting_sr_bonus_cap: number;
  batting_sr_bonus_divisor: number;

  bowling_wicket_points: number;
  bowling_maiden_points: number;
  bowling_threefer_bonus: number;
  bowling_fivefer_bonus: number;
  bowling_noball_penalty: number;
  bowling_wide_penalty: number;
  bowling_eco_target: number;
  bowling_eco_bonus_multiplier: number;
  bowling_eco_bonus_cap: number;

  fielding_catch_points: number;
  fielding_runout_points: number;
  fielding_stumping_points: number;
  fielding_dropped_catch_penalty: number;
}

const DEFAULT_SCORING: Omit<ScoringSettings, "id" | "updated_at"> = {
  batting_weight: 0.4,
  bowling_weight: 0.35,
  fielding_weight: 0.25,

  batting_run_points: 1,
  batting_four_points: 2,
  batting_six_points: 3,
  batting_thirty_bonus: 5,
  batting_fifty_bonus: 10,
  batting_hundred_bonus: 20,
  batting_sr_bonus_cap: 30,
  batting_sr_bonus_divisor: 5,

  bowling_wicket_points: 10,
  bowling_maiden_points: 5,
  bowling_threefer_bonus: 5,
  bowling_fivefer_bonus: 10,
  bowling_noball_penalty: 1,
  bowling_wide_penalty: 1,
  bowling_eco_target: 8,
  bowling_eco_bonus_multiplier: 3,
  bowling_eco_bonus_cap: 25,

  fielding_catch_points: 5,
  fielding_runout_points: 7,
  fielding_stumping_points: 7,
  fielding_dropped_catch_penalty: 5,
};

function coerceSettings(row: any): ScoringSettings {
  return {
    id: Number(row?.id ?? 1),
    updated_at: String(row?.updated_at ?? new Date().toISOString()),

    batting_weight: Number(row?.batting_weight ?? DEFAULT_SCORING.batting_weight),
    bowling_weight: Number(row?.bowling_weight ?? DEFAULT_SCORING.bowling_weight),
    fielding_weight: Number(row?.fielding_weight ?? DEFAULT_SCORING.fielding_weight),

    batting_run_points: Number(row?.batting_run_points ?? DEFAULT_SCORING.batting_run_points),
    batting_four_points: Number(row?.batting_four_points ?? DEFAULT_SCORING.batting_four_points),
    batting_six_points: Number(row?.batting_six_points ?? DEFAULT_SCORING.batting_six_points),
    batting_thirty_bonus: Number(row?.batting_thirty_bonus ?? DEFAULT_SCORING.batting_thirty_bonus),
    batting_fifty_bonus: Number(row?.batting_fifty_bonus ?? DEFAULT_SCORING.batting_fifty_bonus),
    batting_hundred_bonus: Number(row?.batting_hundred_bonus ?? DEFAULT_SCORING.batting_hundred_bonus),
    batting_sr_bonus_cap: Number(row?.batting_sr_bonus_cap ?? DEFAULT_SCORING.batting_sr_bonus_cap),
    batting_sr_bonus_divisor: Number(row?.batting_sr_bonus_divisor ?? DEFAULT_SCORING.batting_sr_bonus_divisor),

    bowling_wicket_points: Number(row?.bowling_wicket_points ?? DEFAULT_SCORING.bowling_wicket_points),
    bowling_maiden_points: Number(row?.bowling_maiden_points ?? DEFAULT_SCORING.bowling_maiden_points),
    bowling_threefer_bonus: Number(row?.bowling_threefer_bonus ?? DEFAULT_SCORING.bowling_threefer_bonus),
    bowling_fivefer_bonus: Number(row?.bowling_fivefer_bonus ?? DEFAULT_SCORING.bowling_fivefer_bonus),
    bowling_noball_penalty: Number(row?.bowling_noball_penalty ?? DEFAULT_SCORING.bowling_noball_penalty),
    bowling_wide_penalty: Number(row?.bowling_wide_penalty ?? DEFAULT_SCORING.bowling_wide_penalty),
    bowling_eco_target: Number(row?.bowling_eco_target ?? DEFAULT_SCORING.bowling_eco_target),
    bowling_eco_bonus_multiplier: Number(row?.bowling_eco_bonus_multiplier ?? DEFAULT_SCORING.bowling_eco_bonus_multiplier),
    bowling_eco_bonus_cap: Number(row?.bowling_eco_bonus_cap ?? DEFAULT_SCORING.bowling_eco_bonus_cap),

    fielding_catch_points: Number(row?.fielding_catch_points ?? DEFAULT_SCORING.fielding_catch_points),
    fielding_runout_points: Number(row?.fielding_runout_points ?? DEFAULT_SCORING.fielding_runout_points),
    fielding_stumping_points: Number(row?.fielding_stumping_points ?? DEFAULT_SCORING.fielding_stumping_points),
    fielding_dropped_catch_penalty: Number(row?.fielding_dropped_catch_penalty ?? DEFAULT_SCORING.fielding_dropped_catch_penalty),
  };
}

export function useScoringSettings() {
  const [settings, setSettings] = useState<ScoringSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("scoring_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setSettings(null);
      setLoading(false);
      return;
    }

    setSettings(coerceSettings(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const channel = supabase
      .channel("scoring-settings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scoring_settings" },
        () => fetchSettings()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const updateSettings = useCallback(async (patch: Partial<ScoringSettings>) => {
    const { data, error } = await supabase
      .from("scoring_settings")
      .update(patch)
      .eq("id", 1)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    setSettings(coerceSettings(data));
    return data;
  }, []);

  return {
    settings: settings ?? (settings === null ? null : settings),
    loading,
    error,
    refetch: fetchSettings,
    updateSettings,
  };
}
