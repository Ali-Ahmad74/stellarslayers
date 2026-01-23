import { Badge } from "@/components/ui/badge";

type MatchLike = {
  id: number;
  result: string | null;
};

function shortResult(result: string | null) {
  if (!result) return "–";
  if (result === "Won") return "W";
  if (result === "Lost") return "L";
  if (result === "Tied" || result === "Draw") return "T";
  return "NR";
}

function badgeVariant(result: string | null) {
  if (result === "Won") return "default" as const;
  if (result === "Lost") return "destructive" as const;
  return "secondary" as const;
}

export function SeriesFormStrip({ matches, length = 5 }: { matches: MatchLike[]; length?: number }) {
  const items = matches.slice(0, length);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <div className="text-sm text-muted-foreground">Form (last {Math.min(length, matches.length)}):</div>
      <div className="flex items-center gap-1">
        {items.map((m) => (
          <Badge key={m.id} variant={badgeVariant(m.result)} className="px-2 py-1 tabular-nums">
            {shortResult(m.result)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
