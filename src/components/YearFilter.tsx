import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface YearFilterProps {
  selectedYear: string;
  onYearChange: (year: string) => void;
}

const YEARS = ["all", "2023", "2024", "2025", "2026"];

export function YearFilter({ selectedYear, onYearChange }: YearFilterProps) {
  return (
    <Select value={selectedYear} onValueChange={onYearChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent>
        {YEARS.map((year) => (
          <SelectItem key={year} value={year}>
            {year === "all" ? "All Time" : year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
