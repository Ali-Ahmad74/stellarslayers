import { motion } from "framer-motion";
import { Achievement, TIER_BG, TIER_COLORS } from "@/lib/achievements";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

export function AchievementBadge({ 
  achievement, 
  unlocked = true, 
  showTooltip = true,
  size = "md" 
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: "w-10 h-10 text-lg",
    md: "w-14 h-14 text-2xl",
    lg: "w-20 h-20 text-4xl",
  };

  const nameSizeClasses = {
    sm: "text-[10px] max-w-[60px]",
    md: "text-xs max-w-[80px]",
    lg: "text-sm max-w-[100px]",
  };

  const badge = (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center gap-1"
    >
      <div
        className={`
          relative flex items-center justify-center rounded-full border-2
          ${sizeClasses[size]}
          ${unlocked ? TIER_BG[achievement.tier] : "bg-muted/30 border-muted grayscale opacity-50"}
          transition-all duration-200
        `}
      >
        {unlocked && (
          <div 
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${TIER_COLORS[achievement.tier]} opacity-20`} 
          />
        )}
        <span className={unlocked ? "" : "opacity-40"}>{achievement.icon}</span>
      </div>
      <span className={`${nameSizeClasses[size]} text-center font-medium leading-tight truncate ${unlocked ? "text-foreground" : "text-muted-foreground opacity-50"}`}>
        {achievement.name}
      </span>
    </motion.div>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">{achievement.name}</p>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
          <p className="text-xs capitalize text-primary">{achievement.tier} • {achievement.category}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
