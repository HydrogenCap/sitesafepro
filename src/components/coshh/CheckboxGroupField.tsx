import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

interface CheckboxGroupFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: Record<string, string>;
}

export const CheckboxGroupField = <T extends FieldValues>({
  control,
  name,
  label,
  options,
}: CheckboxGroupFieldProps<T>) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(options).map(([value, optLabel]) => (
            <div key={value} className="flex items-center space-x-2">
              <Checkbox
                id={`${name}-${value}`}
                checked={(field.value || []).includes(value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    field.onChange([...(field.value || []), value]);
                  } else {
                    field.onChange((field.value || []).filter((v: string) => v !== value));
                  }
                }}
              />
              <label htmlFor={`${name}-${value}`} className="text-sm">
                {optLabel}
              </label>
            </div>
          ))}
        </div>
      </FormItem>
    )}
  />
);
