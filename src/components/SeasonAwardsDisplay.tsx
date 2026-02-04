import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Target, Shield, Star } from "lucide-react";
import { useSeasonAwards, SeasonAward } from "@/hooks/useSeasonAwards";
import { useSeasons } from "@/hooks/useSeasons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

const awardConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  batsman_of_season: {
    label: "Batsman of the Season",
    icon: <Trophy className="w-5 h-5" />,
    color: "from-emerald-500 to-teal-600",
  },
  bowler_of_season: {
    label: "Bowler of the Season",
    icon: <Target className="w-5 h-5" />,
    color: "from-red-500 to-rose-600",
  },
  fielder_of_season: {
    label: "Fielder of the Season",
    icon: <Shield className="w-5 h-5" />,
    color: "from-blue-500 to-indigo-600",
  },
  mvp: {
    label: "Most Valuable Player",
    icon: <Star className="w-5 h-5" />,
    color: "from-amber-500 to-orange-600",
  },
};

function AwardCard({ award }: { award: SeasonAward }) {
  const config = awardConfig[award.award_type] ?? {
    label: award.award_type,
    icon: <Trophy className="w-5 h-5" />,
    color: "from-primary to-primary",
  };

  return (
    <Link to={`/player/${award.player_id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="relative overflow-hidden rounded-xl border bg-card shadow-lg hover:shadow-xl transition-all cursor-pointer group"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-white`}>
              {config.icon}
            </div>
            <div>
              <p className="font-semibold text-sm">{config.label}</p>
              <p className="text-xs text-muted-foreground">{award.season_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {award.player_photo_url ? (
              <img
                src={award.player_photo_url}
                alt={award.player_name}
                className="w-12 h-12 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                {config.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{award.player_name}</p>
              <p className="text-sm text-muted-foreground">
                {award.award_type === "batsman_of_season" && `${award.points} runs`}
                {award.award_type === "bowler_of_season" && `${award.points} wickets`}
                {award.award_type === "fielder_of_season" && `${award.points} contributions`}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export function SeasonAwardsDisplay({ compact = false }: { compact?: boolean }) {
  const { seasons, loading: seasonsLoading, activeSeasonId } = useSeasons();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonInitialized, setSeasonInitialized] = useState(false);

  // Set default season to active season when loaded
  useEffect(() => {
    if (!seasonsLoading && !seasonInitialized && activeSeasonId) {
      setSelectedSeasonId(activeSeasonId);
      setSeasonInitialized(true);
    } else if (!seasonsLoading && !seasonInitialized && !activeSeasonId) {
      setSelectedSeasonId('all');
      setSeasonInitialized(true);
    }
  }, [seasonsLoading, activeSeasonId, seasonInitialized]);

  const effectiveSeasonId = selectedSeasonId ?? 'all';
  const seasonIdFilter = effectiveSeasonId === "all" ? undefined : Number(effectiveSeasonId);
  const { data: awards, isLoading, error } = useSeasonAwards(seasonIdFilter);

  if (isLoading || seasonsLoading) {
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
          Failed to load season awards
        </CardContent>
      </Card>
    );
  }

  if (!awards || awards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Season Awards
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No season awards calculated yet. Awards are generated when seasons end.
        </CardContent>
      </Card>
    );
  }

  // Group by season for display
  const groupedBySeason = awards.reduce((acc, award) => {
    if (!acc[award.season_name]) acc[award.season_name] = [];
    acc[award.season_name].push(award);
    return acc;
  }, {} as Record<string, SeasonAward[]>);

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Season Awards
        </CardTitle>
        {seasons && seasons.length > 0 && (
          <Select value={effectiveSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All seasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All seasons</SelectItem>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {compact ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {awards.slice(0, 3).map((award) => (
              <AwardCard key={award.id} award={award} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBySeason).map(([seasonName, seasonAwards]) => (
              <div key={seasonName}>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Badge variant="outline">{seasonName}</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {seasonAwards.map((award) => (
                    <AwardCard key={award.id} award={award} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
