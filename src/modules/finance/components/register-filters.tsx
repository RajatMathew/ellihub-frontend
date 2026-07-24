import { Button } from '@/app/components/ui/button';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { QuickBooksRegisterClr } from '@/modules/integrations/schemas/quickbooks.schema';
import { Search } from 'lucide-react';

const ALL_VALUE = '__all__';

const CLR_OPTIONS: Array<{ value: QuickBooksRegisterClr; label: string }> = [
  { value: 'UNCLEARED', label: 'Uncleared' },
  { value: 'CLEARED', label: 'Cleared' },
  { value: 'RECONCILED', label: 'Reconciled' },
];

interface RegisterFiltersProps {
  startDate: string;
  endDate: string;
  search: string;
  clr: QuickBooksRegisterClr | undefined;
  transactionType: string | undefined;
  transactionTypes: string[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClrChange: (value: string | null) => void;
  onTransactionTypeChange: (value: string | null) => void;
  onClearFilters: () => void;
}

export function RegisterFilters({
  startDate,
  endDate,
  search,
  clr,
  transactionType,
  transactionTypes,
  hasActiveFilters,
  onSearchChange,
  onStartDateChange,
  onEndDateChange,
  onClrChange,
  onTransactionTypeChange,
  onClearFilters,
}: RegisterFiltersProps) {
  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-12">
      <div className="sm:col-span-2 xl:col-span-3">
        <label htmlFor="register-search" className="sr-only">
          Search transactions
        </label>
        <InputWrapper variant="sm" className="gap-2 px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            id="register-search"
            value={search}
            placeholder="Search payee, category, memo..."
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </InputWrapper>
      </div>

      <div className="xl:col-span-2">
        <label htmlFor="register-start-date" className="sr-only">
          Start date
        </label>
        <Input
          id="register-start-date"
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
        />
      </div>

      <div className="xl:col-span-2">
        <label htmlFor="register-end-date" className="sr-only">
          End date
        </label>
        <Input
          id="register-end-date"
          type="date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
        />
      </div>

      <div className="xl:col-span-2">
        <Select
          value={clr ?? ALL_VALUE}
          onValueChange={(value) => onClrChange(value === ALL_VALUE ? null : value)}
        >
          <SelectTrigger aria-label="Cleared status">
            <SelectValue placeholder="All CLR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All CLR</SelectItem>
            {CLR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="xl:col-span-2">
        <Select
          value={transactionType ?? ALL_VALUE}
          onValueChange={(value) => onTransactionTypeChange(value === ALL_VALUE ? null : value)}
        >
          <SelectTrigger aria-label="Transaction type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All types</SelectItem>
            {transactionTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={!hasActiveFilters}
        onClick={onClearFilters}
        className="justify-self-start xl:col-span-1 xl:justify-self-end"
      >
        Clear
      </Button>
    </div>
  );
}
