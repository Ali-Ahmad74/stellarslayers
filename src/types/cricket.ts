export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';

export interface Player {
  id: number;
  name: string;
  batting_style: string | null;
  bowling_style: string | null;
  role: PlayerRole;
  photo_url: string | null;
  created_at: string;
}

export interface PlayerStats {
  player_id: number;
  matches: number;
  total_runs: number;
  total_balls: number;
  fours: number;
  sixes: number;
  times_out: number;
  thirties: number;
  fifties: number;
  hundreds: number;
  bowling_balls: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
  wides: number;
  no_balls: number;
  fours_conceded: number;
  sixes_conceded: number;
  dot_balls: number;
  three_fers: number;
  five_fers: number;
  catches: number;
  runouts: number;
  stumpings: number;
  dropped_catches: number;
}

export interface PlayerRatings {
  player_id: number;
  batting_rating: number;
  bowling_rating: number;
  fielding_rating: number;
  allrounder_rating: number;
  overall_rating: number;
}

export interface Match {
  id: number;
  match_date: string;
  overs: number;
  venue: string | null;
  created_at: string;
}

export interface BattingInput {
  id: number;
  match_id: number;
  player_id: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
}

export interface BowlingInput {
  id: number;
  match_id: number;
  player_id: number;
  balls: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
  wides: number;
  no_balls: number;
  fours_conceded: number;
  sixes_conceded: number;
  dot_balls: number;
}

export interface FieldingInput {
  id: number;
  match_id: number;
  player_id: number;
  catches: number;
  runouts: number;
  stumpings: number;
  dropped_catches: number;
}

export interface PlayerWithStats extends Player {
  stats: PlayerStats | null;
  ratings: PlayerRatings | null;
}

export interface RankingPlayer {
  rank: number;
  id: number;
  name: string;
  role: PlayerRole;
  photo_url?: string | null;
  rating: number;
  matches?: number;
  runs?: number;
  strikeRate?: number;
  wickets?: number;
  economy?: number;
  catches?: number;
  runouts?: number;
  stumpings?: number;
  weeklyChange?: number;
  monthlyChange?: number;
}

export type RankingCategory = 'batting' | 'bowling' | 'fielding' | 'overall';
