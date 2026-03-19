import { motion } from 'framer-motion';
import { FlaskConical, HeartPulse, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

interface COSHHSummaryCardsProps {
  totalCount: number;
  healthSurveillanceCount: number;
  missingSdsCount: number;
}

export const COSHHSummaryCards = ({
  totalCount,
  healthSurveillanceCount,
  missingSdsCount,
}: COSHHSummaryCardsProps) => {
  const cards = [
    {
      label: 'Total Substances',
      value: totalCount,
      icon: FlaskConical,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Requiring Health Surveillance',
      value: healthSurveillanceCount,
      icon: HeartPulse,
      color: healthSurveillanceCount > 0 ? 'text-red-500' : 'text-success',
      bgColor: healthSurveillanceCount > 0 ? 'bg-red-500/10' : 'bg-success/10',
      highlight: healthSurveillanceCount > 0,
    },
    {
      label: 'Missing Safety Data Sheets',
      value: missingSdsCount,
      icon: FileWarning,
      color: missingSdsCount > 0 ? 'text-amber-500' : 'text-success',
      bgColor: missingSdsCount > 0 ? 'bg-amber-500/10' : 'bg-success/10',
      highlight: missingSdsCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={cn(
            'bg-card rounded-xl p-4 border transition-all',
            card.highlight ? 'border-amber-500/50' : 'border-border'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', card.bgColor)}>
              <card.icon className={cn('h-5 w-5', card.color)} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
