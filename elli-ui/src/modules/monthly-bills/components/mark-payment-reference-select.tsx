import { FormControl, FormField, FormItem, FormLabel } from '@/app/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { MarkPaymentFormData } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import type { Control } from 'react-hook-form';

/** Shared shape of the QuickBooks bank-account and category reference records. */
interface ReferenceOption {
  id: string;
  qbId: string;
  name: string;
  fullyQualifiedName: string | null;
}

interface MarkPaymentReferenceSelectProps {
  control: Control<MarkPaymentFormData>;
  name: 'bankAccountId' | 'categoryId';
  label: string;
  options: ReferenceOption[];
  isLoading: boolean;
  placeholder: string;
}

export function MarkPaymentReferenceSelect({
  control,
  name,
  label,
  options,
  isLoading,
  placeholder,
}: MarkPaymentReferenceSelectProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.qbId}>
                  {option.fullyQualifiedName ?? option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}
