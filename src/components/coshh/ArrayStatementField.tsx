import { useState } from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

interface ArrayStatementFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  commonOptions: string[];
  placeholder?: string;
  showCustomInput?: boolean;
  displayAs?: 'badges' | 'list';
}

export const ArrayStatementField = <T extends FieldValues>({
  control,
  name,
  label,
  commonOptions,
  placeholder = 'Or type custom entry',
  showCustomInput = false,
  displayAs = 'badges',
}: ArrayStatementFieldProps<T>) => {
  const [customValue, setCustomValue] = useState('');

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const current: string[] = field.value || [];

        const addItem = (value: string) => {
          if (!value.trim() || current.includes(value)) return;
          field.onChange([...current, value]);
          setCustomValue('');
        };

        const removeItem = (value: string) => {
          field.onChange(current.filter((v) => v !== value));
        };

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="space-y-2">
              <Select value="" onValueChange={addItem}>
                <SelectTrigger>
                  <SelectValue placeholder={`Add common ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {commonOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {showCustomInput && (
                <div className="flex gap-2">
                  <Input
                    placeholder={placeholder}
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem(customValue);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addItem(customValue)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {displayAs === 'badges' ? (
                <div className="flex flex-wrap gap-2">
                  {current.map((item) => (
                    <Badge key={item} variant="secondary" className="text-xs">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {current.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <span className="text-sm flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormItem>
        );
      }}
    />
  );
};
