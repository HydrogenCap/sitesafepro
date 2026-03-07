import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface DatePickerFieldProps {
  label: string;
  description?: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  disablePast?: boolean;
  placeholder?: string;
  clearLabel?: string;
}

export const DatePickerField = ({
  label,
  description,
  value,
  onChange,
  disabled,
  disablePast,
  placeholder = 'Pick a date',
  clearLabel = 'Clear date',
}: DatePickerFieldProps) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={disablePast ? (date) => date < new Date() : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
    {value && (
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={() => onChange(undefined)}
      >
        {clearLabel}
      </Button>
    )}
  </div>
);
