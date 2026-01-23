import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { ScoringSettings, useScoringSettings } from "@/hooks/useScoringSettings";
import { toast } from "sonner";

type Draft = Pick<
  ScoringSettings,
  | "batting_weight"
  | "bowling_weight"
  | "fielding_weight"
  | "batting_run_points"
  | "batting_four_points"
  | "batting_six_points"
  | "batting_thirty_bonus"
  | "batting_fifty_bonus"
  | "batting_hundred_bonus"
  | "batting_sr_bonus_cap"
  | "batting_sr_bonus_divisor"
  | "bowling_wicket_points"
  | "bowling_maiden_points"
  | "bowling_threefer_bonus"
  | "bowling_fivefer_bonus"
  | "bowling_noball_penalty"
  | "bowling_wide_penalty"
  | "bowling_eco_target"
  | "bowling_eco_bonus_multiplier"
  | "bowling_eco_bonus_cap"
  | "fielding_catch_points"
  | "fielding_runout_points"
  | "fielding_stumping_points"
  | "fielding_dropped_catch_penalty"
>;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function ScoringSettingsPanel() {
  const { isAdmin } = useAuth();
  const { settings, loading, updateSettings } = useScoringSettings();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!settings) return;
    setDraft({
      batting_weight: settings.batting_weight,
      bowling_weight: settings.bowling_weight,
      fielding_weight: settings.fielding_weight,
      batting_run_points: settings.batting_run_points,
      batting_four_points: settings.batting_four_points,
      batting_six_points: settings.batting_six_points,
      batting_thirty_bonus: settings.batting_thirty_bonus,
      batting_fifty_bonus: settings.batting_fifty_bonus,
      batting_hundred_bonus: settings.batting_hundred_bonus,
      batting_sr_bonus_cap: settings.batting_sr_bonus_cap,
      batting_sr_bonus_divisor: settings.batting_sr_bonus_divisor,
      bowling_wicket_points: settings.bowling_wicket_points,
      bowling_maiden_points: settings.bowling_maiden_points,
      bowling_threefer_bonus: settings.bowling_threefer_bonus,
      bowling_fivefer_bonus: settings.bowling_fivefer_bonus,
      bowling_noball_penalty: settings.bowling_noball_penalty,
      bowling_wide_penalty: settings.bowling_wide_penalty,
      bowling_eco_target: settings.bowling_eco_target,
      bowling_eco_bonus_multiplier: settings.bowling_eco_bonus_multiplier,
      bowling_eco_bonus_cap: settings.bowling_eco_bonus_cap,
      fielding_catch_points: settings.fielding_catch_points,
      fielding_runout_points: settings.fielding_runout_points,
      fielding_stumping_points: settings.fielding_stumping_points,
      fielding_dropped_catch_penalty: settings.fielding_dropped_catch_penalty,
    });
  }, [settings]);

  const SettingSlider = ({
    label,
    value,
    min,
    max,
    step,
    onChange,
    suffix,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    suffix?: string;
  }) => (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value.toFixed(step < 1 ? 1 : 0)}{suffix ?? ""}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );

  const normalizedWeights = useMemo(() => {
    if (!draft) return null;
    const sum = draft.batting_weight + draft.bowling_weight + draft.fielding_weight;
    if (sum <= 0) return { ...draft, batting_weight: 0.4, bowling_weight: 0.35, fielding_weight: 0.25 };
    return {
      ...draft,
      batting_weight: draft.batting_weight / sum,
      bowling_weight: draft.bowling_weight / sum,
      fielding_weight: draft.fielding_weight / sum,
    };
  }, [draft]);

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Scoring Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading || !normalizedWeights ? (
          <div className="text-sm text-muted-foreground">Loading scoring settings…</div>
        ) : (
          <>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Overall weights (normalized)</Label>
                <div className="grid gap-3">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Batting</span>
                      <span className="font-medium">{normalizedWeights.batting_weight.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[normalizedWeights.batting_weight * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) =>
                        setDraft((d) =>
                          d
                            ? { ...d, batting_weight: clamp(v, 0, 100) }
                            : d
                        )
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Bowling</span>
                      <span className="font-medium">{normalizedWeights.bowling_weight.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[normalizedWeights.bowling_weight * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) =>
                        setDraft((d) =>
                          d
                            ? { ...d, bowling_weight: clamp(v, 0, 100) }
                            : d
                        )
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Fielding</span>
                      <span className="font-medium">{normalizedWeights.fielding_weight.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[normalizedWeights.fielding_weight * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) =>
                        setDraft((d) =>
                          d
                            ? { ...d, fielding_weight: clamp(v, 0, 100) }
                            : d
                        )
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Weights affect total points; category leaderboards use the same underlying formula knobs below.
                </p>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label>Batting</Label>
                  <div className="grid gap-4">
                    <SettingSlider
                      label="Points per run"
                      value={normalizedWeights.batting_run_points}
                      min={0}
                      max={3}
                      step={0.1}
                      onChange={(v) => setDraft((d) => (d ? { ...d, batting_run_points: v } : d))}
                    />
                    <SettingSlider
                      label="Points per four"
                      value={normalizedWeights.batting_four_points}
                      min={0}
                      max={10}
                      step={0.5}
                      onChange={(v) => setDraft((d) => (d ? { ...d, batting_four_points: v } : d))}
                    />
                    <SettingSlider
                      label="Points per six"
                      value={normalizedWeights.batting_six_points}
                      min={0}
                      max={15}
                      step={0.5}
                      onChange={(v) => setDraft((d) => (d ? { ...d, batting_six_points: v } : d))}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <SettingSlider
                        label="30+ bonus"
                        value={normalizedWeights.batting_thirty_bonus}
                        min={0}
                        max={20}
                        step={1}
                        onChange={(v) => setDraft((d) => (d ? { ...d, batting_thirty_bonus: v } : d))}
                      />
                      <SettingSlider
                        label="50+ bonus"
                        value={normalizedWeights.batting_fifty_bonus}
                        min={0}
                        max={40}
                        step={1}
                        onChange={(v) => setDraft((d) => (d ? { ...d, batting_fifty_bonus: v } : d))}
                      />
                      <SettingSlider
                        label="100+ bonus"
                        value={normalizedWeights.batting_hundred_bonus}
                        min={0}
                        max={80}
                        step={1}
                        onChange={(v) => setDraft((d) => (d ? { ...d, batting_hundred_bonus: v } : d))}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingSlider
                        label="SR bonus cap"
                        value={normalizedWeights.batting_sr_bonus_cap}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => setDraft((d) => (d ? { ...d, batting_sr_bonus_cap: v } : d))}
                      />
                      <SettingSlider
                        label="SR bonus divisor"
                        value={normalizedWeights.batting_sr_bonus_divisor}
                        min={1}
                        max={20}
                        step={1}
                        onChange={(v) => setDraft((d) => (d ? { ...d, batting_sr_bonus_divisor: v } : d))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Bowling</Label>
                  <div className="grid gap-4">
                    <SettingSlider
                      label="Points per wicket"
                      value={normalizedWeights.bowling_wicket_points}
                      min={0}
                      max={30}
                      step={0.5}
                      onChange={(v) => setDraft((d) => (d ? { ...d, bowling_wicket_points: v } : d))}
                    />
                    <SettingSlider
                      label="Points per maiden"
                      value={normalizedWeights.bowling_maiden_points}
                      min={0}
                      max={20}
                      step={0.5}
                      onChange={(v) => setDraft((d) => (d ? { ...d, bowling_maiden_points: v } : d))}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingSlider
                        label="3-fer bonus"
                        value={normalizedWeights.bowling_threefer_bonus}
                        min={0}
                        max={40}
                        step={1}
                        onChange={(v) => setDraft((d) => (d ? { ...d, bowling_threefer_bonus: v } : d))}
                      />
                      <SettingSlider
                        label="5-fer bonus"
                        value={normalizedWeights.bowling_fivefer_bonus}
                        min={0}
                        max={80}
                        step={1}
                        onChange={(v) => setDraft((d) => (d ? { ...d, bowling_fivefer_bonus: v } : d))}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingSlider
                        label="No-ball penalty"
                        value={normalizedWeights.bowling_noball_penalty}
                        min={0}
                        max={10}
                        step={0.5}
                        onChange={(v) => setDraft((d) => (d ? { ...d, bowling_noball_penalty: v } : d))}
                      />
                      <SettingSlider
                        label="Wide penalty"
                        value={normalizedWeights.bowling_wide_penalty}
                        min={0}
                        max={10}
                        step={0.5}
                        onChange={(v) => setDraft((d) => (d ? { ...d, bowling_wide_penalty: v } : d))}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <SettingSlider
                        label="Eco target"
                        value={normalizedWeights.bowling_eco_target}
                        min={0}
                        max={20}
                        step={0.5}
                        onChange={(v) => setDraft((d) => (d ? { ...d, bowling_eco_target: v } : d))}
                      />
                      <SettingSlider
                        label="Eco multiplier"
                        value={normalizedWeights.bowling_eco_bonus_multiplier}
                        min={0}
                        max={10}
                        step={0.5}
                        onChange={(v) => setDraft((d) => (d ? { ...d, bowling_eco_bonus_multiplier: v } : d))}
                      />
                      <SettingSlider
                        label="Eco bonus cap"
                        value={normalizedWeights.bowling_eco_bonus_cap}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => setDraft((d) => (d ? { ...d, bowling_eco_bonus_cap: v } : d))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Fielding</Label>
                  <div className="grid gap-4">
                    <SettingSlider
                      label="Points per catch"
                      value={normalizedWeights.fielding_catch_points}
                      min={0}
                      max={20}
                      step={0.5}
                      onChange={(v) => setDraft((d) => (d ? { ...d, fielding_catch_points: v } : d))}
                    />
                    <SettingSlider
                      label="Points per runout"
                      value={normalizedWeights.fielding_runout_points}
                      min={0}
                      max={30}
                      step={0.5}
                      onChange={(v) => setDraft((d) => (d ? { ...d, fielding_runout_points: v } : d))}
                    />
                    <SettingSlider
                      label="Points per stumping"
                      value={normalizedWeights.fielding_stumping_points}
                      min={0}
                      max={30}
                      step={0.5}
                      onChange={(v) => setDraft((d) => (d ? { ...d, fielding_stumping_points: v } : d))}
                    />
                    <SettingSlider
                      label="Dropped catch penalty"
                      value={normalizedWeights.fielding_dropped_catch_penalty}
                      min={0}
                      max={30}
                      step={0.5}
                      onChange={(v) => setDraft((d) => (d ? { ...d, fielding_dropped_catch_penalty: v } : d))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!settings) return;
                  setDraft({
                    batting_weight: settings.batting_weight,
                    bowling_weight: settings.bowling_weight,
                    fielding_weight: settings.fielding_weight,
                    batting_run_points: settings.batting_run_points,
                    batting_four_points: settings.batting_four_points,
                    batting_six_points: settings.batting_six_points,
                    batting_thirty_bonus: settings.batting_thirty_bonus,
                    batting_fifty_bonus: settings.batting_fifty_bonus,
                    batting_hundred_bonus: settings.batting_hundred_bonus,
                    batting_sr_bonus_cap: settings.batting_sr_bonus_cap,
                    batting_sr_bonus_divisor: settings.batting_sr_bonus_divisor,
                    bowling_wicket_points: settings.bowling_wicket_points,
                    bowling_maiden_points: settings.bowling_maiden_points,
                    bowling_threefer_bonus: settings.bowling_threefer_bonus,
                    bowling_fivefer_bonus: settings.bowling_fivefer_bonus,
                    bowling_noball_penalty: settings.bowling_noball_penalty,
                    bowling_wide_penalty: settings.bowling_wide_penalty,
                    bowling_eco_target: settings.bowling_eco_target,
                    bowling_eco_bonus_multiplier: settings.bowling_eco_bonus_multiplier,
                    bowling_eco_bonus_cap: settings.bowling_eco_bonus_cap,
                    fielding_catch_points: settings.fielding_catch_points,
                    fielding_runout_points: settings.fielding_runout_points,
                    fielding_stumping_points: settings.fielding_stumping_points,
                    fielding_dropped_catch_penalty: settings.fielding_dropped_catch_penalty,
                  });
                }}
                disabled={saving}
              >
                Reset
              </Button>
              <Button
                onClick={async () => {
                  if (!normalizedWeights) return;
                  setSaving(true);
                  try {
                    // Save normalized weights back to backend.
                    await updateSettings({
                      batting_weight: normalizedWeights.batting_weight,
                      bowling_weight: normalizedWeights.bowling_weight,
                      fielding_weight: normalizedWeights.fielding_weight,
                      batting_run_points: normalizedWeights.batting_run_points,
                      batting_four_points: normalizedWeights.batting_four_points,
                      batting_six_points: normalizedWeights.batting_six_points,
                      batting_thirty_bonus: normalizedWeights.batting_thirty_bonus,
                      batting_fifty_bonus: normalizedWeights.batting_fifty_bonus,
                      batting_hundred_bonus: normalizedWeights.batting_hundred_bonus,
                      batting_sr_bonus_cap: normalizedWeights.batting_sr_bonus_cap,
                      batting_sr_bonus_divisor: normalizedWeights.batting_sr_bonus_divisor,
                      bowling_wicket_points: normalizedWeights.bowling_wicket_points,
                      bowling_maiden_points: normalizedWeights.bowling_maiden_points,
                      bowling_threefer_bonus: normalizedWeights.bowling_threefer_bonus,
                      bowling_fivefer_bonus: normalizedWeights.bowling_fivefer_bonus,
                      bowling_noball_penalty: normalizedWeights.bowling_noball_penalty,
                      bowling_wide_penalty: normalizedWeights.bowling_wide_penalty,
                      bowling_eco_target: normalizedWeights.bowling_eco_target,
                      bowling_eco_bonus_multiplier: normalizedWeights.bowling_eco_bonus_multiplier,
                      bowling_eco_bonus_cap: normalizedWeights.bowling_eco_bonus_cap,
                      fielding_catch_points: normalizedWeights.fielding_catch_points,
                      fielding_runout_points: normalizedWeights.fielding_runout_points,
                      fielding_stumping_points: normalizedWeights.fielding_stumping_points,
                      fielding_dropped_catch_penalty: normalizedWeights.fielding_dropped_catch_penalty,
                    });
                    toast.success("Scoring settings updated");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to update scoring settings");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
