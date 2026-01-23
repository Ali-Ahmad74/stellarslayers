import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

export type AdminWizardStepKey = "season" | "players" | "tournament" | "match" | "performance";

export interface AdminGettingStartedWizardProps {
  isAdmin: boolean;
  seasonsCount: number;
  playersCount: number;
  tournamentsCount: number;
  matchesCount: number;
  hasAnyPerformance: boolean;
  onGoToStep: (step: AdminWizardStepKey, intent: "view" | "add") => void;
}

export function AdminGettingStartedWizard({
  isAdmin,
  seasonsCount,
  playersCount,
  tournamentsCount,
  matchesCount,
  hasAnyPerformance,
  onGoToStep,
}: AdminGettingStartedWizardProps) {
  const steps = useMemo(
    () => [
      {
        key: "season" as const,
        title: "Create Season",
        done: seasonsCount > 0,
        cta: "Add season",
        countLabel: `${seasonsCount} season${seasonsCount === 1 ? "" : "s"}`,
      },
      {
        key: "players" as const,
        title: "Add Players",
        done: playersCount > 0,
        cta: "Add player",
        countLabel: `${playersCount} player${playersCount === 1 ? "" : "s"}`,
      },
      {
        key: "tournament" as const,
        title: "Create Tournament",
        done: tournamentsCount > 0,
        cta: "Add tournament",
        countLabel: `${tournamentsCount} tournament${tournamentsCount === 1 ? "" : "s"}`,
      },
      {
        key: "match" as const,
        title: "Add Match",
        done: matchesCount > 0,
        cta: "Add match",
        countLabel: `${matchesCount} match${matchesCount === 1 ? "" : "s"}`,
      },
      {
        key: "performance" as const,
        title: "Enter Performances",
        done: hasAnyPerformance,
        cta: "Add performance",
        countLabel: hasAnyPerformance ? "1+ entries" : "0 entries",
      },
    ],
    [seasonsCount, playersCount, tournamentsCount, matchesCount, hasAnyPerformance]
  );

  const completed = steps.filter((s) => s.done).length;
  const percent = Math.round((completed / steps.length) * 100);
  const nextStepKey = steps.find((s) => !s.done)?.key;

  if (!isAdmin) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Sparkles className="w-5 h-5 text-primary" />
          Getting Started
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Setup progress</span>
            <span className="font-medium">{percent}%</span>
          </div>
          <Progress value={percent} />
        </div>

        <div className="grid gap-2">
          {steps.map((step, index) => {
            const prevDone = index === 0 ? true : steps[index - 1].done;
            const blocked = !step.done && !prevDone;
            const isNext = nextStepKey === step.key;

            return (
            <div
              key={step.key}
              className={
                "flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 " +
                (isNext ? "ring-1 ring-primary/40" : "")
              }
            >
              <div className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {step.done ? `Done • ${step.countLabel}` : blocked ? `Locked • ${step.countLabel}` : `Not started • ${step.countLabel}`}
                  </div>
                </div>
              </div>
                <Button
                  variant={step.done ? "outline" : "default"}
                  size="sm"
                  onClick={() => onGoToStep(step.key, step.done ? "view" : "add")}
                  disabled={blocked}
                >
                  {step.done ? "View" : step.cta}
                </Button>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
