import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Award } from "lucide-react";
import { usePlayerOfTheMatch, POTMLeader } from "@/hooks/usePlayerOfTheMatch";

function LeaderCard({ leader, rank }: { leader: POTMLeader; rank: number }) {
  const rankColors = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-amber-600 to-orange-700"];
  const bgColor = rankColors[rank - 1] ?? "from-muted to-muted";

  return (
    <Link to={`/player/${leader.player_id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        className="relative overflow-hidden rounded-xl border bg-card shadow-lg hover:shadow-xl transition-all cursor-pointer"
      >
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${bgColor}`} />
        <div className="p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${bgColor} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
            {rank}
          </div>
          {leader.player_photo_url ? (
            <img
              src={leader.player_photo_url}
              alt={leader.player_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted border-2 border-border flex items-center justify-center">
              <Trophy className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{leader.player_name}</p>
            <p className="text-sm text-muted-foreground">{leader.player_role}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary tabular-nums">{leader.award_count}</p>
            <p className="text-xs text-muted-foreground">Awards</p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export function HallOfFame() {
  const { data, isLoading, error } = usePlayerOfTheMatch();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load Hall of Fame
        </CardContent>
      </Card>
    );
  }

  const leaders = data?.leaders ?? [];

  if (leaders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Player of the Match Hall of Fame
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No Player of the Match awards yet. Start assigning them in match settings!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Player of the Match Hall of Fame
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaders.slice(0, 5).map((leader, idx) => (
          <LeaderCard key={leader.player_id} leader={leader} rank={idx + 1} />
        ))}
        {leaders.length > 5 && (
          <p className="text-center text-sm text-muted-foreground pt-2">
            +{leaders.length - 5} more players with awards
          </p>
        )}
      </CardContent>
    </Card>
  );
}
