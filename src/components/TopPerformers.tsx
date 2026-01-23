import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RankBadge } from './RankBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { RoleBadge } from './RoleBadge';
import { RankingPlayer } from '@/types/cricket';
interface TopPerformersProps {
  title: string;
  icon: string;
  players: RankingPlayer[];
  statKey: 'runs' | 'wickets' | 'catches' | 'rating';
  statLabel: string;
  gradient?: string;
}
export function TopPerformers({
  title,
  icon,
  players,
  statKey,
  statLabel,
  gradient = 'from-purple-500 to-pink-500'
}: TopPerformersProps) {
  const topThree = players.slice(0, 3);
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4
  }}>
      <Card variant="performer" className="h-full">
        <CardHeader className={`bg-gradient-to-r ${gradient} text-white`}>
          <CardTitle className="flex items-center gap-3 text-xl">
            <span className="text-2xl">{icon}</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {topThree.map((player, index) => <Link key={player.id} to={`/player/${player.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <RankBadge rank={player.rank} size="sm" />
                  <PlayerAvatar name={player.name} size="sm" />
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors text-center font-serif">
                      {player.name}
                    </p>
                    <RoleBadge role={player.role} size="sm" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {player[statKey as keyof RankingPlayer]}
                  </p>
                  <p className="text-xs text-muted-foreground">{statLabel}</p>
                </div>
              </Link>)}
          </div>
        </CardContent>
      </Card>
    </motion.div>;
}