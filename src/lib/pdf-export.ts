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

export interface ExportOptions {
  teamName?: string;
  logoUrl?: string | null;
}

/**
 * Load an image and convert to base64 for PDF embedding
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Add header with optional logo to the PDF
 */
async function addHeader(
  doc: jsPDF,
  title: string,
  options: ExportOptions,
  isLandscape: boolean = false
): Promise<number> {
  const pageWidth = isLandscape ? 297 : 210;
  let yPosition = 15;
  let textStartX = 14;

  // Add logo if available
  if (options.logoUrl) {
    const logoBase64 = await loadImageAsBase64(options.logoUrl);
    if (logoBase64) {
      try {
        const logoSize = 18;
        doc.addImage(logoBase64, "PNG", 14, 10, logoSize, logoSize);
        textStartX = 14 + logoSize + 6; // Logo width + padding
      } catch {
        // If logo fails, continue without it
      }
    }
  }

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, textStartX, yPosition + 5);

  // Team name subtitle if different from title
  if (options.teamName && !title.includes(options.teamName)) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(options.teamName, textStartX, yPosition + 12);
    yPosition += 5;
  }

  // Date - right aligned
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, yPosition + 5, { align: "right" });

  return options.logoUrl ? 35 : 28;
}

export async function exportPlayerStats(players: PlayerExportData[], options: ExportOptions = {}) {
  const doc = new jsPDF({ orientation: "landscape" });
  
  const title = options.teamName ? `${options.teamName} - Player Statistics` : "Player Statistics";
  const headerHeight = await addHeader(doc, title, options, true);

  // Batting table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Batting Statistics", 14, headerHeight + 5);

  autoTable(doc, {
    startY: headerHeight + 9,
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

export async function exportMatches(matches: MatchExportData[], options: ExportOptions = {}) {
  const doc = new jsPDF();
  
  const title = options.teamName ? `${options.teamName} - Match History` : "Match History";
  const headerHeight = await addHeader(doc, title, options, false);

  // Summary
  const won = matches.filter((m) => m.result === "Won").length;
  const lost = matches.filter((m) => m.result === "Lost").length;
  const other = matches.length - won - lost;
  
  doc.setFontSize(11);
  doc.text(`Total Matches: ${matches.length}  |  Won: ${won}  |  Lost: ${lost}  |  Other: ${other}`, 14, headerHeight + 6);

  // Table
  autoTable(doc, {
    startY: headerHeight + 12,
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
