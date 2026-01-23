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
  | "bowling_wicket_points"
  | "fielding_catch_points"
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
      bowling_wicket_points: settings.bowling_wicket_points,
      fielding_catch_points: settings.fielding_catch_points,
    });
  }, [settings]);

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
                  These weights affect the overall total points only (batting/bowling/fielding leaderboards still use their category points).
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Quick formula knobs</Label>
                <div className="grid gap-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Points per run</span>
                      <span className="font-medium">{normalizedWeights.batting_run_points.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[normalizedWeights.batting_run_points]}
                      min={0}
                      max={3}
                      step={0.1}
                      onValueChange={([v]) =>
                        setDraft((d) => (d ? { ...d, batting_run_points: v } : d))
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Points per wicket</span>
                      <span className="font-medium">{normalizedWeights.bowling_wicket_points.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[normalizedWeights.bowling_wicket_points]}
                      min={0}
                      max={25}
                      step={0.5}
                      onValueChange={([v]) =>
                        setDraft((d) => (d ? { ...d, bowling_wicket_points: v } : d))
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Points per catch</span>
                      <span className="font-medium">{normalizedWeights.fielding_catch_points.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[normalizedWeights.fielding_catch_points]}
                      min={0}
                      max={15}
                      step={0.5}
                      onValueChange={([v]) =>
                        setDraft((d) => (d ? { ...d, fielding_catch_points: v } : d))
                      }
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
                    bowling_wicket_points: settings.bowling_wicket_points,
                    fielding_catch_points: settings.fielding_catch_points,
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
                      bowling_wicket_points: normalizedWeights.bowling_wicket_points,
                      fielding_catch_points: normalizedWeights.fielding_catch_points,
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
