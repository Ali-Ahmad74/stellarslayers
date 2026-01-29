import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  onExportPlayers?: () => void;
  onExportMatches?: () => void;
  disabled?: boolean;
}

export function ExportButton({ onExportPlayers, onExportMatches, disabled }: ExportButtonProps) {
  const hasMultiple = onExportPlayers && onExportMatches;

  if (!hasMultiple) {
    const handler = onExportPlayers || onExportMatches;
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handler} 
        disabled={disabled}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Export CSV
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportPlayers}>
          Player Stats (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportMatches}>
          Match Data (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
