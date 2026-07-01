import { TableCardHeader, TableCardHeaderSearch } from '@/app/components/table-card-header';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Switch } from '@/app/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { formatCurrency } from '@/app/lib/helpers';
import type {
  RecurringBillFrequency,
  RecurringBillRule,
} from '@/modules/monthly-bills/types/recurring-bills.types';
import { CreditCard, Plus, Receipt, X } from 'lucide-react';

interface RecurringBillsWorkspaceProps {
  rules: RecurringBillRule[];
  search: string;
  onSearchChange: (search: string) => void;
  onCreateRule: () => void;
  onPayRule: (rule: RecurringBillRule) => void;
  onToggleActive: (ruleId: string, isActive: boolean) => void;
}

export function RecurringBillsWorkspace({
  rules,
  search,
  onSearchChange,
  onCreateRule,
  onPayRule,
  onToggleActive,
}: RecurringBillsWorkspaceProps) {
  const visibleRules = rules.filter((rule) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [rule.name, rule.vendorName, rule.categoryName, rule.bankAccountName]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });
  const hasActiveFilters = Boolean(search);

  return (
    <Card className="overflow-hidden">
      <TableCardHeader
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            Recurring Bills
          </span>
        }
        actions={
          <div className="flex w-full min-w-0 flex-col items-stretch gap-2.5 xl:flex-row xl:flex-nowrap xl:items-center">
            <TableCardHeaderSearch
              value={search}
              placeholder="Search vendor, bill, category, or bank account..."
              onChange={onSearchChange}
              className="xl:w-[34rem]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-table-card-header-foreground/25 bg-card-header text-table-card-header-foreground hover:border-table-card-header-foreground/40 hover:bg-card-header hover:text-table-card-header-foreground [&_svg]:text-table-card-header-foreground"
              onClick={onCreateRule}
            >
              <Plus className="size-3.5" />
              Add recurring bill
            </Button>
          </div>
        }
      />

      {visibleRules.length === 0 ? (
        <RecurringBillsEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            onSearchChange('');
          }}
        />
      ) : (
        <div className="border-t">
          <Table className="min-w-[68rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 min-w-64 text-xs font-semibold uppercase tracking-normal">
                  Bill
                </TableHead>
                <TableHead className="h-10 min-w-52 text-xs font-semibold uppercase tracking-normal">
                  Category
                </TableHead>
                <TableHead className="h-10 min-w-36 text-xs font-semibold uppercase tracking-normal">
                  Pay from
                </TableHead>
                <TableHead className="h-10 min-w-32 text-xs font-semibold uppercase tracking-normal">
                  Repeats
                </TableHead>
                <TableHead className="h-10 min-w-28 text-xs font-semibold uppercase tracking-normal">
                  Due
                </TableHead>
                <TableHead className="h-10 min-w-32 text-xs font-semibold uppercase tracking-normal">
                  Amount
                </TableHead>
                <TableHead className="h-10 min-w-28 text-center text-xs font-semibold uppercase tracking-normal" />
                <TableHead className="h-10 w-24 text-center text-xs font-semibold uppercase tracking-normal">
                  Active
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="min-w-64 py-3">
                    <p className="break-words text-sm font-semibold leading-5 text-foreground">
                      {rule.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{rule.vendorName}</p>
                  </TableCell>
                  <TableCell className="min-w-52 py-3 text-sm text-muted-foreground">
                    {rule.categoryName ?? 'Not assigned'}
                  </TableCell>
                  <TableCell className="min-w-36 py-3 text-sm text-muted-foreground">
                    {rule.bankAccountName ?? 'Not selected'}
                  </TableCell>
                  <TableCell className="min-w-32 py-3 text-sm text-foreground">
                    {getFrequencyLabel(rule.frequency)}
                  </TableCell>
                  <TableCell className="min-w-28 py-3 text-sm text-foreground">
                    {getDueLabel(rule)}
                  </TableCell>
                  <TableCell className="min-w-32 py-3">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {rule.defaultAmount > 0 ? formatCurrency(rule.defaultAmount) : 'Variable'}
                    </p>
                    {rule.lastPaidLabel && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Paid {rule.lastPaidLabel}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="min-w-28 py-3 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!rule.isActive}
                      onClick={() => onPayRule(rule)}
                    >
                      <CreditCard className="size-3.5" />
                      Pay
                    </Button>
                  </TableCell>
                  <TableCell className="w-24 py-3 text-center">
                    <Switch
                      size="sm"
                      checked={rule.isActive}
                      onCheckedChange={(isActive) => onToggleActive(rule.id, isActive)}
                      aria-label={`Toggle ${rule.name}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function RecurringBillsEmptyState({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="border-t px-4 py-12 sm:px-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-11 items-center justify-center rounded-md bg-muted">
          <Receipt className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No recurring bills found</p>
          <p className="text-xs text-muted-foreground">
            Clear the search or choose another filter.
          </p>
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

function getFrequencyLabel(frequency: RecurringBillFrequency) {
  if (frequency === 'biweekly') return 'Every 2 weeks';
  return frequency.charAt(0).toUpperCase() + frequency.slice(1);
}

function getDueLabel(rule: RecurringBillRule) {
  if (rule.frequency === 'weekly' || rule.frequency === 'biweekly') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[Math.max(0, Math.min(rule.dueDay - 1, 6))];
  }

  return `Day ${rule.dueDay}`;
}
