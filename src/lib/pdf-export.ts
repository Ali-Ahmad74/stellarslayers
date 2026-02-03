/**
 * PDF Export utilities for cricket stats
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export function exportPlayerStats(players: PlayerExportData[], teamName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  
  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(teamName ? `${teamName} - Player Statistics` : "Player Statistics", 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  // Batting table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Batting Statistics", 14, 38);

  autoTable(doc, {
    startY: 42,
    head: [["Name", "Role", "Matches", "Runs", "Balls", "4s", "6s", "Avg", "SR"]],
    body: players.map((p) => [
      p.name,
      p.role,
      p.matches,
      p.runs,
      p.balls_faced,
      p.fours,
      p.sixes,
      p.average,
      p.strike_rate,
    ]),
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
    },
  });

  // Bowling table on next section
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Bowling & Fielding Statistics", 14, finalY + 12);

  autoTable(doc, {
    startY: finalY + 16,
    head: [["Name", "Wickets", "Runs", "Overs", "Econ", "Catches", "Run Outs", "Stumpings"]],
    body: players.map((p) => [
      p.name,
      p.wickets,
      p.runs_conceded,
      p.overs_bowled,
      p.economy,
      p.catches,
      p.runouts,
      p.stumpings,
    ]),
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 35 },
    },
  });

  doc.save(`player-stats-${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportMatches(matches: MatchExportData[], teamName?: string) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(teamName ? `${teamName} - Match History` : "Match History", 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  // Summary
  const won = matches.filter((m) => m.result === "Won").length;
  const lost = matches.filter((m) => m.result === "Lost").length;
  const other = matches.length - won - lost;
  
  doc.setFontSize(11);
  doc.text(`Total Matches: ${matches.length}  |  Won: ${won}  |  Lost: ${lost}  |  Other: ${other}`, 14, 36);

  // Table
  autoTable(doc, {
    startY: 44,
    head: [["Date", "Opponent", "Venue", "Score", "Opp Score", "Result", "Overs", "Series"]],
    body: matches.map((m) => [
      m.date,
      m.opponent || "-",
      m.venue || "-",
      m.our_score,
      m.opponent_score,
      m.result || "-",
      m.overs,
      m.series || "-",
    ]),
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      7: { cellWidth: 30 },
    },
  });

  doc.save(`matches-${new Date().toISOString().split("T")[0]}.pdf`);
}
