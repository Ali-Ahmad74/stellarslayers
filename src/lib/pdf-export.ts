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

    // Reset text color

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

// Achievement interface for PDF export
export interface AchievementData {
  name: string;
  icon: string;
  tier: string;
  category: string;
}

// Player Full Detail Stats interface
export interface PlayerFullStatsExportData {
  name: string;
  role: string;
  photoUrl?: string | null;
  batting_style?: string | null;
  bowling_style?: string | null;
  matches: number;
  // Batting
  total_runs: number;
  total_balls: number;
  fours: number;
  sixes: number;
  times_out: number;
  thirties: number;
  fifties: number;
  hundreds: number;
  battingAverage: string;
  strikeRate: string;
  // Bowling
  wickets: number;
  runs_conceded: number;
  bowling_balls: number;
  maidens: number;
  wides: number;
  no_balls: number;
  dot_balls: number;
  fours_conceded: number;
  sixes_conceded: number;
  three_fers: number;
  five_fers: number;
  economy: string;
  bowlingAverage: string;
  // Fielding
  catches: number;
  runouts: number;
  stumpings: number;
  dropped_catches: number;
  // Points
  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  totalPoints: number;
  // Season info
  seasonName?: string;
  // Achievements
  achievements?: AchievementData[];
}

/**
 * Export a single player's full detailed statistics to PDF
 */
export async function exportPlayerFullStats(
  player: PlayerFullStatsExportData,
  options: ExportOptions = {}
) {
  const doc = new jsPDF();
  const pageWidth = 210;
  
  let currentY = 15;
  let textStartX = 14;

  // Add team logo if available (top left)
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
  doc.text(player.name, textStartX, currentY + 5);

  // Team name
  if (options.teamName) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(options.teamName, textStartX, currentY + 12);
    doc.setTextColor(0, 0, 0);
  }

  // Date - right aligned
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, currentY + 5, { align: "right" });
  doc.setTextColor(0, 0, 0);

  currentY = options.logoUrl ? 35 : 28;

  // Player Photo (if available) - centered on right side
  let photoEndY = currentY;
  if (player.photoUrl) {
    const photoBase64 = await loadImageAsBase64(player.photoUrl);
    if (photoBase64) {
      try {
        const photoSize = 35;
        doc.addImage(photoBase64, "JPEG", pageWidth - 14 - photoSize, currentY, photoSize, photoSize);
        photoEndY = currentY + photoSize + 5;
      } catch {
        // If photo fails, continue without it
      }
    }
  }

  // Player Info section (left side)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Player Details", 14, currentY + 5);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  
  currentY += 12;
  doc.text(`Role: ${player.role}`, 14, currentY);
  currentY += 6;
  
  if (player.batting_style) {
    doc.text(`Batting Style: ${player.batting_style}`, 14, currentY);
    currentY += 6;
  }
  if (player.bowling_style) {
    doc.text(`Bowling Style: ${player.bowling_style}`, 14, currentY);
    currentY += 6;
  }
  doc.text(`Matches Played: ${player.matches}`, 14, currentY);
  currentY += 6;
  if (player.seasonName) {
    doc.text(`Season: ${player.seasonName}`, 14, currentY);
    currentY += 6;
  }
  
  doc.setTextColor(0, 0, 0);
  currentY = Math.max(currentY + 8, photoEndY);

  // Performance Points Summary Box
  doc.setFillColor(41, 128, 185);
  doc.roundedRect(14, currentY, 182, 28, 3, 3, "F");
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Performance Points", 20, currentY + 8);
  
  // Points in grid format
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const pointsY = currentY + 18;
  doc.text(`Batting: ${player.battingPoints}`, 20, pointsY);
  doc.text(`Bowling: ${player.bowlingPoints}`, 65, pointsY);
  doc.text(`Fielding: ${player.fieldingPoints}`, 110, pointsY);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: ${player.totalPoints}`, 155, pointsY);
  
  doc.setTextColor(0, 0, 0);
  currentY += 36;

  // ============ BATTING STATISTICS ============
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("BATTING STATISTICS", 14, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [["Runs", "Balls", "Average", "Strike Rate", "4s", "6s", "Dismissals"]],
    body: [[
      player.total_runs,
      player.total_balls,
      player.battingAverage,
      player.strikeRate,
      player.fours,
      player.sixes,
      player.times_out,
    ]],
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129], fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 10, cellPadding: 3, halign: "center" },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Batting Milestones
  autoTable(doc, {
    startY: currentY,
    head: [["30s", "50s", "100s"]],
    body: [[player.thirties, player.fifties, player.hundreds]],
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129], fontStyle: "bold", fontSize: 9, textColor: [255, 255, 255] },
    styles: { fontSize: 11, cellPadding: 4, halign: "center", fontStyle: "bold" },
    margin: { left: 14, right: 100 },
    tableWidth: 82,
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ============ BOWLING STATISTICS ============
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(239, 68, 68);
  doc.text("BOWLING STATISTICS", 14, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [["Wickets", "Runs", "Overs", "Economy", "Average", "Maidens", "Dot Balls"]],
    body: [[
      player.wickets,
      player.runs_conceded,
      (player.bowling_balls / 6).toFixed(1),
      player.economy,
      player.bowlingAverage,
      player.maidens,
      player.dot_balls,
    ]],
    theme: "striped",
    headStyles: { fillColor: [239, 68, 68], fontStyle: "bold", fontSize: 9, textColor: [255, 255, 255] },
    styles: { fontSize: 10, cellPadding: 3, halign: "center" },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Bowling extras and milestones
  autoTable(doc, {
    startY: currentY,
    head: [["3-Wicket Hauls", "5-Wicket Hauls", "Wides", "No Balls", "4s Conceded", "6s Conceded"]],
    body: [[
      player.three_fers,
      player.five_fers,
      player.wides,
      player.no_balls,
      player.fours_conceded,
      player.sixes_conceded,
    ]],
    theme: "grid",
    headStyles: { fillColor: [251, 146, 60], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 10, cellPadding: 3, halign: "center" },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ============ FIELDING STATISTICS ============
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246);
  doc.text("FIELDING STATISTICS", 14, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [["Catches", "Run Outs", "Stumpings", "Dropped Catches"]],
    body: [[
      player.catches,
      player.runouts,
      player.stumpings,
      player.dropped_catches,
    ]],
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 10, cellPadding: 3, halign: "center" },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ============ ACHIEVEMENTS ============
  if (player.achievements && player.achievements.length > 0) {
    // Check if we need a new page
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(168, 85, 247);
    doc.text("ACHIEVEMENTS UNLOCKED", 14, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 4;

    // Group achievements by category
    const achievementRows = player.achievements.map(a => [
      a.icon,
      a.name,
      a.category.charAt(0).toUpperCase() + a.category.slice(1),
      a.tier.charAt(0).toUpperCase() + a.tier.slice(1),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["", "Achievement", "Category", "Tier"]],
      body: achievementRows,
      theme: "striped",
      headStyles: { fillColor: [168, 85, 247], fontStyle: "bold", fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 70 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // Add footers
  addFooters(doc, options, false);

  const safeName = player.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const fileName = `${safeName}-stats-${new Date().toISOString().split("T")[0]}.pdf`;
  
  // Use blob output for better mobile compatibility
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 100);
}
