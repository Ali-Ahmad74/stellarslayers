import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Filter } from 'lucide-react';

interface RankingFiltersProps {
  minMatches: number;
  minOvers: number;
  onMinMatchesChange: (value: number) => void;
  onMinOversChange: (value: number) => void;
  showOversFilter?: boolean;
}

export function RankingFilters({
  minMatches,
  minOvers,
  onMinMatchesChange,
  onMinOversChange,
  showOversFilter = false,
}: RankingFiltersProps) {
  return (
    <Card className="mb-4">
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="minMatches" className="text-sm whitespace-nowrap">
              Min Matches:
            </Label>
            <Input
              id="minMatches"
              type="number"
              min={0}
              value={minMatches}
              onChange={(e) => onMinMatchesChange(parseInt(e.target.value) || 0)}
              className="w-16 h-8"
            />
          </div>
          
          {showOversFilter && (
            <div className="flex items-center gap-2">
              <Label htmlFor="minOvers" className="text-sm whitespace-nowrap">
                Min Overs:
              </Label>
              <Input
                id="minOvers"
                type="number"
                min={0}
                step={0.1}
                value={minOvers}
                onChange={(e) => onMinOversChange(parseFloat(e.target.value) || 0)}
                className="w-16 h-8"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
