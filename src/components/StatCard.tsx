import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  sublabel?: string;
  delay?: number;
  className?: string;
}

export function StatCard({ icon, label, value, sublabel, delay = 0, className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card variant="stat" className={cn("p-6", className)}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-primary font-semibold">{label}</h3>
        </div>
        <div className="text-4xl font-bold font-display text-foreground">
          {value}
        </div>
        {sublabel && (
          <p className="text-sm text-muted-foreground mt-1">{sublabel}</p>
        )}
      </Card>
    </motion.div>
  );
}
