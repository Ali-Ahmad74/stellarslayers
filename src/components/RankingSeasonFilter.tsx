import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { useSeasons } from '@/hooks/useSeasons';

interface RankingSeasonFilterProps {
  selectedSeason: string;
  onSeasonChange: (seasonId: string) => void;
  className?: string;
}

export const RankingSeasonFilter = ({ 
  selectedSeason, 
  onSeasonChange, 
  className = '' 
}: RankingSeasonFilterProps) => {
  const { seasons, loading } = useSeasons();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedSeason} onValueChange={onSeasonChange} disabled={loading}>
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder={loading ? "Loading..." : "All Seasons"} />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          <SelectItem value="all">All Seasons</SelectItem>
          {seasons.map((season) => (
            <SelectItem key={season.id} value={season.id.toString()}>
              {season.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
