import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PPE_TYPE_LABELS } from '@/types/coshh';
import {
  Hand,
  Eye,
  Shield,
  Wind,
  Shirt,
  Footprints,
} from 'lucide-react';

interface PPEIconProps {
  type: string;
  size?: 'sm' | 'md';
  className?: string;
}

const PPE_ICONS: Record<string, React.ElementType> = {
  nitrile_gloves: Hand,
  latex_gloves: Hand,
  safety_goggles: Eye,
  face_shield: Shield,
  ffp2_mask: Wind,
  ffp3_mask: Wind,
  rpe: Wind,
  overalls: Shirt,
  chemical_apron: Shirt,
  safety_boots: Footprints,
};

const SIZE_CLASSES = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
};

const ICON_SIZE = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
};

export const PPEIcon = ({ type, size = 'sm', className }: PPEIconProps) => {
  const Icon = PPE_ICONS[type] || Shield;
  const label = PPE_TYPE_LABELS[type as keyof typeof PPE_TYPE_LABELS] || type;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'rounded-full bg-blue-500/10 flex items-center justify-center',
            SIZE_CLASSES[size],
            className
          )}
        >
          <Icon className={cn('text-blue-600', ICON_SIZE[size])} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

interface PPEIconGridProps {
  types: string[];
  size?: 'sm' | 'md';
  maxDisplay?: number;
}

export const PPEIconGrid = ({ types, size = 'sm', maxDisplay = 4 }: PPEIconGridProps) => {
  const displayed = types.slice(0, maxDisplay);
  const remaining = types.length - maxDisplay;

  if (types.length === 0) {
    return <span className="text-xs text-muted-foreground">None specified</span>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {displayed.map((type) => (
        <PPEIcon key={type} type={type} size={size} />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground ml-1">+{remaining}</span>
      )}
    </div>
  );
};
