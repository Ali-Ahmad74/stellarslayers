/**
 * Utility functions to calculate performance points for matches
 * Used for auto-selecting Player of the Match and Player of the Series
 */

export interface BattingPerformance {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
}

export interface BowlingPerformance {
  wickets: number;
  runs_conceded: number;
  balls: number;
  maidens: number;
  dot_balls: number;
}

export interface FieldingPerformance {
  catches: number;
  runouts: number;
  stumpings: number;
}

export interface MatchPerformance {
  player_id: number;
  batting?: BattingPerformance;
  bowling?: BowlingPerformance;
  fielding?: FieldingPerformance;
}

/**
 * Calculate performance points for a player in a match
 * Higher points = better performance
 */
export function calculateMatchPoints(perf: MatchPerformance): number {
  let points = 0;

  // Batting points
  if (perf.batting) {
    const { runs, balls, fours, sixes, out } = perf.batting;
    points += runs * 1; // 1 point per run
    points += fours * 1; // +1 bonus per four
    points += sixes * 2; // +2 bonus per six
    
    // Strike rate bonus (if faced at least 10 balls)
    if (balls >= 10) {
      const sr = (runs / balls) * 100;
      if (sr >= 150) points += 10;
      else if (sr >= 125) points += 5;
    }
    
    // Milestone bonuses
    if (runs >= 100) points += 20;
    else if (runs >= 50) points += 10;
    else if (runs >= 30) points += 5;
    
    // Not out bonus
    if (!out && runs >= 20) points += 5;
  }

  // Bowling points
  if (perf.bowling) {
    const { wickets, runs_conceded, balls, maidens } = perf.bowling;
    points += wickets * 20; // 20 points per wicket
    points += maidens * 5; // 5 points per maiden
    
    // Economy bonus (if bowled at least 12 balls / 2 overs)
    if (balls >= 12) {
      const overs = balls / 6;
      const eco = runs_conceded / overs;
      if (eco <= 4) points += 15;
      else if (eco <= 6) points += 10;
      else if (eco <= 8) points += 5;
    }
    
    // Wicket milestone bonuses
    if (wickets >= 5) points += 15;
    else if (wickets >= 3) points += 8;
  }

  // Fielding points
  if (perf.fielding) {
    const { catches, runouts, stumpings } = perf.fielding;
    points += catches * 8; // 8 points per catch
    points += runouts * 10; // 10 points per runout
    points += stumpings * 10; // 10 points per stumping
  }

  return points;
}

/**
 * Given an array of match performances, return the player_id with highest points
 */
export function getBestPerformer(performances: MatchPerformance[]): number | null {
  if (performances.length === 0) return null;

  let bestPlayerId: number | null = null;
  let maxPoints = 0;

  for (const perf of performances) {
    const pts = calculateMatchPoints(perf);
    if (pts > maxPoints) {
      maxPoints = pts;
      bestPlayerId = perf.player_id;
    }
  }

  return bestPlayerId;
}
