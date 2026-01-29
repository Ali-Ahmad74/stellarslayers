/**
 * CSV Export utilities for cricket stats
 */

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV<T extends object>(data: T[], columns?: (keyof T)[]): string {
  if (data.length === 0) return "";
  
  const headers = columns || (Object.keys(data[0]) as (keyof T)[]);
  const headerRow = headers.map((h) => escapeCSV(String(h))).join(",");
  
  const rows = data.map((row) =>
    headers.map((h) => escapeCSV(row[h])).join(",")
  );
  
  return [headerRow, ...rows].join("\n");
}

export function downloadCSV<T extends object>(data: T[], filename: string, columns?: (keyof T)[]) {
  const csv = toCSV(data, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Player stats export
export interface PlayerExportData {
  name: string;
  role: string;
  matches: number;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  average: string;
  strike_rate: string;
  wickets: number;
  runs_conceded: number;
  overs_bowled: string;
  economy: string;
  catches: number;
  runouts: number;
  stumpings: number;
}

export function exportPlayerStats(players: PlayerExportData[]) {
  const columns: (keyof PlayerExportData)[] = [
    "name",
    "role",
    "matches",
    "runs",
    "balls_faced",
    "fours",
    "sixes",
    "average",
    "strike_rate",
    "wickets",
    "runs_conceded",
    "overs_bowled",
    "economy",
    "catches",
    "runouts",
    "stumpings",
  ];
  downloadCSV(players, `player-stats-${new Date().toISOString().split("T")[0]}`, columns);
}

// Match export
export interface MatchExportData {
  date: string;
  opponent: string;
  venue: string;
  our_score: number;
  opponent_score: number;
  result: string;
  overs: number;
  series: string;
}

export function exportMatches(matches: MatchExportData[]) {
  const columns: (keyof MatchExportData)[] = ["date", "opponent", "venue", "our_score", "opponent_score", "result", "overs", "series"];
  downloadCSV(matches, `matches-${new Date().toISOString().split("T")[0]}`, columns);
}
