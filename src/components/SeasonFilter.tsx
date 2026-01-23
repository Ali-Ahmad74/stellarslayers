import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface SeasonFilterProps {
  years: number[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  className?: string;
}

export const SeasonFilter = ({ years, selectedYear, onYearChange, className = '' }: SeasonFilterProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedYear} onValueChange={onYearChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Seasons" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Seasons</SelectItem>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
