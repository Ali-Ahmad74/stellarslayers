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

// Detailed match export with scorecards
export interface BattingScorecardRow {
  player_name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
}

export interface BowlingScorecardRow {
  player_name: string;
  overs: string;
  maidens: number;
  runs_conceded: number;
  wickets: number;
  economy: string;
  extras: string;
}

export interface FieldingScorecardRow {
  player_name: string;
  catches: number;
  runouts: number;
  stumpings: number;
}

export interface DetailedMatchExportData extends MatchExportData {
  matchId: number;
  batting: BattingScorecardRow[];
  bowling: BowlingScorecardRow[];
  fielding: FieldingScorecardRow[];
}

export interface ExportOptions {
  teamName?: string;
  logoUrl?: string | null;
  watermarkHandle?: string | null;
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
        textStartX = 14 + logoSize + 6;
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

/**
 * Add footer with page numbers and watermark to all pages
 */
function addFooters(doc: jsPDF, options: ExportOptions, isLandscape: boolean = false) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

    // Page number - center
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });

    // Watermark/Handle - left
    if (options.watermarkHandle) {
      doc.setFontSize(8);
      doc.text(options.watermarkHandle, 14, pageHeight - 10);
    } else if (options.teamName) {
      doc.setFontSize(8);
      doc.text(options.teamName, 14, pageHeight - 10);
    }

    // Generated with Lovable - right
    doc.setFontSize(8);
    doc.text("Generated with Lovable", pageWidth - 14, pageHeight - 10, { align: "right" });

    // Reset text color
    doc.setTextColor(0, 0, 0);
  }
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
    margin: { bottom: 25 },
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
    margin: { bottom: 25 },
  });

  // Add footers to all pages
  addFooters(doc, options, true);

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
    margin: { bottom: 25 },
  });

  // Add footers to all pages
  addFooters(doc, options, false);

  doc.save(`matches-${new Date().toISOString().split("T")[0]}.pdf`);
}

/**
 * Export detailed matches with full scorecards (batting, bowling, fielding)
 */
export async function exportDetailedMatches(matches: DetailedMatchExportData[], options: ExportOptions = {}) {
  const doc = new jsPDF();

  const title = options.teamName ? `${options.teamName} - Match Details` : "Match Details";
  const headerHeight = await addHeader(doc, title, options, false);

  // Summary
  const won = matches.filter((m) => m.result === "Won").length;
  const lost = matches.filter((m) => m.result === "Lost").length;
  const other = matches.length - won - lost;

  doc.setFontSize(11);
  doc.text(`Total Matches: ${matches.length}  |  Won: ${won}  |  Lost: ${lost}  |  Other: ${other}`, 14, headerHeight + 6);

  let currentY = headerHeight + 14;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    // Check if we need a new page
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    // Match header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text(`vs ${match.opponent || "Unknown"} - ${match.result || ""}`, 14, currentY);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${match.date} | ${match.venue || "-"} | Score: ${match.our_score}-${match.opponent_score} | ${match.overs} overs`, 14, currentY + 5);

    currentY += 12;

    // Batting Scorecard
    if (match.batting.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Batting", 14, currentY);
      currentY += 2;

      autoTable(doc, {
        startY: currentY,
        head: [["Player", "R", "B", "4s", "6s", "SR", "Status"]],
        body: match.batting.map((b) => [
          b.player_name,
          b.runs,
          b.balls,
          b.fours,
          b.sixes,
          b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0",
          b.out ? "Out" : "Not Out",
        ]),
        theme: "grid",
        headStyles: { fillColor: [76, 175, 80], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 1.5 },
        margin: { left: 14, right: 14, bottom: 5 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Bowling Scorecard
    if (match.bowling.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Bowling", 14, currentY);
      currentY += 2;

      autoTable(doc, {
        startY: currentY,
        head: [["Player", "O", "M", "R", "W", "Econ", "Extras"]],
        body: match.bowling.map((b) => [
          b.player_name,
          b.overs,
          b.maidens,
          b.runs_conceded,
          b.wickets,
          b.economy,
          b.extras || "-",
        ]),
        theme: "grid",
        headStyles: { fillColor: [244, 67, 54], fontStyle: "bold", fontSize: 8, textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 1.5 },
        margin: { left: 14, right: 14, bottom: 5 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Fielding Highlights
    if (match.fielding.length > 0) {
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Fielding", 14, currentY);
      currentY += 2;

      autoTable(doc, {
        startY: currentY,
        head: [["Player", "Catches", "Run Outs", "Stumpings"]],
        body: match.fielding.map((f) => [f.player_name, f.catches, f.runouts, f.stumpings]),
        theme: "grid",
        headStyles: { fillColor: [255, 152, 0], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 1.5 },
        margin: { left: 14, right: 14, bottom: 5 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Add separator between matches
    if (i < matches.length - 1) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.line(14, currentY, 196, currentY);
        currentY += 8;
      }
    }
  }

  // Add footers to all pages
  addFooters(doc, options, false);

  doc.save(`match-details-${new Date().toISOString().split("T")[0]}.pdf`);
}
