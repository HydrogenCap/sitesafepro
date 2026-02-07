import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { HazardPictogram } from '@/types/coshh';
import { HAZARD_PICTOGRAM_INFO } from '@/types/coshh';
import {
  Flame,
  AlertTriangle,
  Skull,
  Droplets,
  Zap,
  FlaskConical,
  Wind,
  Fish,
  HeartPulse,
} from 'lucide-react';

interface GHSPictogramProps {
  pictogram: HazardPictogram;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const PICTOGRAM_ICONS: Record<HazardPictogram, React.ElementType> = {
  flammable: Flame,
  oxidiser: FlaskConical,
  explosive: Zap,
  toxic: Skull,
  harmful: AlertTriangle,
  corrosive: Droplets,
  gas_under_pressure: Wind,
  health_hazard: HeartPulse,
  environmental: Fish,
};

const SIZE_CLASSES = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const ICON_SIZE_CLASSES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4.5 w-4.5',
  lg: 'h-5 w-5',
};

export const GHSPictogram = ({ 
  pictogram, 
  size = 'md', 
  showLabel = false,
  className 
}: GHSPictogramProps) => {
  const info = HAZARD_PICTOGRAM_INFO[pictogram];
  const Icon = PICTOGRAM_ICONS[pictogram];

  const content = (
    <div
      className={cn(
        'rounded-md flex items-center justify-center border-2 border-black',
        SIZE_CLASSES[size],
        info.color,
        className
      )}
    >
      <Icon className={cn('text-white', ICON_SIZE_CLASSES[size])} />
    </div>
  );

  if (showLabel) {
    return (
      <div className="flex items-center gap-2">
        {content}
        <span className="text-sm text-foreground">{info.label}</span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>
        <p>{info.label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

interface GHSPictogramGridProps {
  pictograms: HazardPictogram[];
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
}

export const GHSPictogramGrid = ({ 
  pictograms, 
  size = 'sm',
  maxDisplay = 4 
}: GHSPictogramGridProps) => {
  const displayed = pictograms.slice(0, maxDisplay);
  const remaining = pictograms.length - maxDisplay;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {displayed.map((pictogram) => (
        <GHSPictogram key={pictogram} pictogram={pictogram} size={size} />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground ml-1">+{remaining}</span>
      )}
    </div>
  );
};

interface GHSPictogramSelectorProps {
  selected: HazardPictogram[];
  onChange: (pictograms: HazardPictogram[]) => void;
}

export const GHSPictogramSelector = ({ selected, onChange }: GHSPictogramSelectorProps) => {
  const allPictograms = Object.keys(HAZARD_PICTOGRAM_INFO) as HazardPictogram[];

  const togglePictogram = (pictogram: HazardPictogram) => {
    if (selected.includes(pictogram)) {
      onChange(selected.filter(p => p !== pictogram));
    } else {
      onChange([...selected, pictogram]);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {allPictograms.map((pictogram) => {
        const info = HAZARD_PICTOGRAM_INFO[pictogram];
        const Icon = PICTOGRAM_ICONS[pictogram];
        const isSelected = selected.includes(pictogram);

        return (
          <button
            key={pictogram}
            type="button"
            onClick={() => togglePictogram(pictogram)}
            className={cn(
              'p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2',
              isSelected
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted'
            )}
          >
            <div
              className={cn(
                'h-10 w-10 rounded-md flex items-center justify-center border-2 border-black',
                info.color
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-medium text-center">{info.label}</span>
          </button>
        );
      })}
    </div>
  );
};
