import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Season {
  id: number;
  name: string;
  year: number;
  is_active?: boolean;
}

interface PlayerSeasonFilterProps {
  seasons: Season[];
  selectedSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
  loading?: boolean;
}

export function PlayerSeasonFilter({ 
  seasons, 
  selectedSeasonId, 
  onSeasonChange,
  loading 
}: PlayerSeasonFilterProps) {
  if (loading) {
    return (
      <div className="w-[180px] h-10 bg-muted animate-pulse rounded-md" />
    );
  }

  if (seasons.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No seasons available</div>
    );
  }

  return (
    <Select value={selectedSeasonId} onValueChange={onSeasonChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select season" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Seasons</SelectItem>
        {seasons.map((season) => (
          <SelectItem key={season.id} value={String(season.id)}>
            {season.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
