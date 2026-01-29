/**
 * Achievements & Badges system for cricket players
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "batting" | "bowling" | "fielding" | "milestone";
  tier: "bronze" | "silver" | "gold" | "platinum";
  requirement: number;
  stat: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Batting milestones
  { id: "first_30", name: "Solid Start", description: "Score 30+ runs in an innings", icon: "🎯", category: "batting", tier: "bronze", requirement: 1, stat: "thirties" },
  { id: "first_50", name: "Half Century Hero", description: "Score your first 50", icon: "⭐", category: "batting", tier: "silver", requirement: 1, stat: "fifties" },
  { id: "five_50s", name: "Consistent Performer", description: "Score 5 half-centuries", icon: "🌟", category: "batting", tier: "gold", requirement: 5, stat: "fifties" },
  { id: "first_100", name: "Century Maker", description: "Score your first 100", icon: "💯", category: "batting", tier: "platinum", requirement: 1, stat: "hundreds" },
  { id: "run_machine_500", name: "Run Machine", description: "Score 500 career runs", icon: "🔥", category: "batting", tier: "silver", requirement: 500, stat: "total_runs" },
  { id: "run_machine_1000", name: "Run Legend", description: "Score 1000 career runs", icon: "👑", category: "batting", tier: "gold", requirement: 1000, stat: "total_runs" },
  { id: "boundary_king_50", name: "Boundary Hunter", description: "Hit 50 fours", icon: "4️⃣", category: "batting", tier: "silver", requirement: 50, stat: "fours" },
  { id: "six_machine_25", name: "Six Machine", description: "Hit 25 sixes", icon: "6️⃣", category: "batting", tier: "silver", requirement: 25, stat: "sixes" },

  // Bowling milestones
  { id: "first_3fer", name: "Wicket Taker", description: "Take 3 wickets in an innings", icon: "🎳", category: "bowling", tier: "bronze", requirement: 1, stat: "three_fers" },
  { id: "first_5fer", name: "Five-for Fame", description: "Take 5 wickets in an innings", icon: "🔥", category: "bowling", tier: "gold", requirement: 1, stat: "five_fers" },
  { id: "wicket_hunter_25", name: "Wicket Hunter", description: "Take 25 career wickets", icon: "⚡", category: "bowling", tier: "silver", requirement: 25, stat: "wickets" },
  { id: "wicket_hunter_50", name: "Wicket Master", description: "Take 50 career wickets", icon: "🏆", category: "bowling", tier: "gold", requirement: 50, stat: "wickets" },
  { id: "maiden_master_5", name: "Maiden Master", description: "Bowl 5 maiden overs", icon: "🎯", category: "bowling", tier: "silver", requirement: 5, stat: "maidens" },

  // Fielding milestones
  { id: "safe_hands_10", name: "Safe Hands", description: "Take 10 catches", icon: "🧤", category: "fielding", tier: "bronze", requirement: 10, stat: "catches" },
  { id: "safe_hands_25", name: "Catching Machine", description: "Take 25 catches", icon: "✋", category: "fielding", tier: "silver", requirement: 25, stat: "catches" },
  { id: "runout_specialist", name: "Runout Specialist", description: "Effect 5 runouts", icon: "🎯", category: "fielding", tier: "silver", requirement: 5, stat: "runouts" },
  { id: "keeper_star", name: "Keeper Star", description: "Effect 5 stumpings", icon: "⚡", category: "fielding", tier: "silver", requirement: 5, stat: "stumpings" },

  // General milestones
  { id: "first_match", name: "Debut", description: "Play your first match", icon: "🏏", category: "milestone", tier: "bronze", requirement: 1, stat: "matches" },
  { id: "veteran_25", name: "Team Regular", description: "Play 25 matches", icon: "📅", category: "milestone", tier: "silver", requirement: 25, stat: "matches" },
  { id: "veteran_50", name: "Veteran", description: "Play 50 matches", icon: "🎖️", category: "milestone", tier: "gold", requirement: 50, stat: "matches" },
];

export interface PlayerStats {
  matches?: number;
  total_runs?: number;
  total_balls?: number;
  fours?: number;
  sixes?: number;
  thirties?: number;
  fifties?: number;
  hundreds?: number;
  wickets?: number;
  maidens?: number;
  three_fers?: number;
  five_fers?: number;
  catches?: number;
  runouts?: number;
  stumpings?: number;
}

export function getUnlockedAchievements(stats: PlayerStats): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => {
    const statValue = stats[achievement.stat as keyof PlayerStats] ?? 0;
    return statValue >= achievement.requirement;
  });
}

export function getNextAchievements(stats: PlayerStats, limit = 3): { achievement: Achievement; progress: number }[] {
  const locked = ACHIEVEMENTS.filter((achievement) => {
    const statValue = stats[achievement.stat as keyof PlayerStats] ?? 0;
    return statValue < achievement.requirement;
  });

  return locked
    .map((achievement) => {
      const statValue = stats[achievement.stat as keyof PlayerStats] ?? 0;
      const progress = Math.min((statValue / achievement.requirement) * 100, 99);
      return { achievement, progress };
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, limit);
}

export const TIER_COLORS = {
  bronze: "from-amber-600 to-amber-800",
  silver: "from-slate-300 to-slate-500",
  gold: "from-yellow-400 to-amber-500",
  platinum: "from-cyan-300 to-blue-500",
} as const;

export const TIER_BG = {
  bronze: "bg-amber-900/20 border-amber-700/50",
  silver: "bg-slate-600/20 border-slate-400/50",
  gold: "bg-yellow-900/20 border-yellow-600/50",
  platinum: "bg-cyan-900/20 border-cyan-500/50",
} as const;
