import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AchievementBadge } from "./AchievementBadge";
import { 
  getUnlockedAchievements, 
  getNextAchievements, 
  PlayerStats,
  Achievement
} from "@/lib/achievements";
import { Trophy } from "lucide-react";

interface PlayerAchievementsProps {
  stats: PlayerStats;
  compact?: boolean;
}

export function PlayerAchievements({ stats, compact = false }: PlayerAchievementsProps) {
  const unlocked = getUnlockedAchievements(stats);
  const upcoming = getNextAchievements(stats, 3);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {unlocked.slice(0, 6).map((ach) => (
          <AchievementBadge key={ach.id} achievement={ach} size="sm" />
        ))}
        {unlocked.length > 6 && (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-sm font-medium">
            +{unlocked.length - 6}
          </div>
        )}
      </div>
    );
  }

  // Group by category
  const grouped = unlocked.reduce<Record<string, Achievement[]>>((acc, ach) => {
    if (!acc[ach.category]) acc[ach.category] = [];
    acc[ach.category].push(ach);
    return acc;
  }, {});

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Trophy className="w-5 h-5 text-accent" />
          Achievements
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {unlocked.length} unlocked
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unlocked badges */}
        {Object.entries(grouped).map(([category, achievements]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-muted-foreground capitalize mb-3">
              {category}
            </h4>
            <div className="flex flex-wrap gap-3">
              {achievements.map((ach, idx) => (
                <motion.div
                  key={ach.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <AchievementBadge achievement={ach} />
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {unlocked.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">
            No achievements unlocked yet. Keep playing!
          </p>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Up Next</h4>
            <div className="space-y-3">
              {upcoming.map(({ achievement, progress }) => (
                <div key={achievement.id} className="flex items-center gap-3">
                  <AchievementBadge achievement={achievement} unlocked={false} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{achievement.name}</p>
                    <Progress value={progress} className="h-1.5 mt-1" />
                  </div>
                  <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
