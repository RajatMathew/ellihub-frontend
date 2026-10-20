import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useMonthlyBillBankAccountsQuery } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import type { Control, FieldValues, Path } from 'react-hook-form';

/** Radix Select has no empty value; this stands for "no bank account named". */
const NO_BANK_ACCOUNT = '__none__';

interface BankAccountSelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  /** Loads the accounts only while the form is open. */
  enabled: boolean;
}

/** The optional ElliHub bank account a payment made by hand came from. */
export function BankAccountSelectField<T extends FieldValues>({
  control,
  name,
  enabled,
}: BankAccountSelectFieldProps<T>) {
  const bankAccountsQuery = useMonthlyBillBankAccountsQuery(enabled);
  const bankAccounts = bankAccountsQuery.data ?? [];

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Bank Account</FormLabel>
          <Select
            value={(field.value as string) || NO_BANK_ACCOUNT}
            onValueChange={(value) => field.onChange(value === NO_BANK_ACCOUNT ? '' : value)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={bankAccountsQuery.isLoading ? 'Loading...' : 'Not specified'}
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NO_BANK_ACCOUNT}>Not specified</SelectItem>
              {bankAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>Optional.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
