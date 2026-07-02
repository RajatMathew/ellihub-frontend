import { TableCardHeader, TableCardHeaderSearch } from '@/app/components/table-card-header';
import { Badge } from '@/app/components/ui/badge';
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
import { formatUploadFileSize } from '@/modules/files/lib/file-upload-policy';
import {
  formatMonthlyBillMonthName,
  getMonthlyBillYear,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import type {
  RecurringBillFrequency,
  RecurringBillRule,
} from '@/modules/monthly-bills/types/recurring-bills.types';
import { CheckCircle2, CreditCard, Paperclip, Plus, Receipt, X } from 'lucide-react';

type RecurringBillRowState = 'payable' | 'paid';

interface RecurringBillsWorkspaceProps {
  rules: RecurringBillRule[];
  selectedDate: Date;
  search: string;
  onSearchChange: (search: string) => void;
  onCreateRule: () => void;
  onPayRule: (rule: RecurringBillRule) => void;
  onToggleActive: (ruleId: string, isActive: boolean) => void;
}

export function RecurringBillsWorkspace({
  rules,
  selectedDate,
  search,
  onSearchChange,
  onCreateRule,
  onPayRule,
  onToggleActive,
}: RecurringBillsWorkspaceProps) {
  const selectedCycleLabel = getCycleLabel(selectedDate);
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
                <TableHead className="h-10 min-w-40 text-xs font-semibold uppercase tracking-normal">
                  Amount
                </TableHead>
                <TableHead className="h-10 min-w-32 text-center text-xs font-semibold uppercase tracking-normal">
                  Status
                </TableHead>
                <TableHead className="h-10 w-24 text-center text-xs font-semibold uppercase tracking-normal">
                  Active
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRules.map((rule) => {
                const rowState = getRowState(rule, selectedCycleLabel);

                return (
                  <TableRow key={rule.id}>
                    <TableCell className="min-w-64 py-3">
                      <p className="break-words text-sm font-semibold leading-5 text-foreground">
                        {rule.name}
                      </p>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                        <p className="text-sm text-muted-foreground">{rule.vendorName}</p>
                        {isVariableAmountRule(rule) && (
                          <Badge variant="warning" appearance="light" size="sm">
                            Variable
                          </Badge>
                        )}
                      </div>
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
                    <TableCell className="min-w-40 py-3">
                      <RecurringBillAmountCell
                        rule={rule}
                        rowState={rowState}
                        selectedCycleLabel={selectedCycleLabel}
                      />
                      {getInvoiceFile(rule, rowState) && (
                        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="size-3 shrink-0" />
                          <span className="truncate">
                            {getInvoiceFile(rule, rowState)?.name} -{' '}
                            {formatUploadFileSize(getInvoiceFile(rule, rowState)!.size)}
                          </span>
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-32 py-3 text-center">
                      <RecurringBillRowAction
                        rule={rule}
                        rowState={rowState}
                        onPayRule={onPayRule}
                      />
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function RecurringBillRowAction({
  rule,
  rowState,
  onPayRule,
}: {
  rule: RecurringBillRule;
  rowState: RecurringBillRowState;
  onPayRule: (rule: RecurringBillRule) => void;
}) {
  if (rowState === 'paid') {
    return (
      <Badge variant="success" appearance="light" size="md" className="h-9 px-3">
        <CheckCircle2 className="size-3.5" />
        Paid
      </Badge>
    );
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      disabled={!rule.isActive}
      onClick={() => onPayRule(rule)}
    >
      <CreditCard className="size-3.5" />
      Pay
    </Button>
  );
}

function RecurringBillAmountCell({
  rule,
  rowState,
  selectedCycleLabel,
}: {
  rule: RecurringBillRule;
  rowState: RecurringBillRowState;
  selectedCycleLabel: string;
}) {
  if (rowState === 'paid') {
    return (
      <>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(rule.lastPaidAmount ?? rule.defaultAmount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {rule.lastPaidLabel ? `Paid ${rule.lastPaidLabel}` : `Paid ${selectedCycleLabel}`}
        </p>
      </>
    );
  }

  const amount = rule.lastPaidAmount ?? rule.defaultAmount;

  if (isVariableAmountRule(rule)) {
    return (
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {amount > 0 ? formatCurrency(amount) : 'Needs amount'}{' '}
        <span className="text-xs font-normal text-muted-foreground">expected</span>
      </p>
    );
  }

  return (
    <p className="text-sm font-semibold tabular-nums text-foreground">
      {amount > 0 ? formatCurrency(amount) : 'Needs amount'}
    </p>
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

function getInvoiceFile(rule: RecurringBillRule, rowState: RecurringBillRowState) {
  if (rowState === 'paid') return rule.lastInvoiceFile;
  return undefined;
}

function getRowState(rule: RecurringBillRule, selectedCycleLabel: string): RecurringBillRowState {
  if (isPaidForCycle(rule, selectedCycleLabel)) return 'paid';
  return 'payable';
}

function isPaidForCycle(rule: RecurringBillRule, selectedCycleLabel: string) {
  if (rule.lastPaidCycleLabel) return rule.lastPaidCycleLabel === selectedCycleLabel;

  return Boolean(rule.lastPaidLabel && rule.lastPaidLabel.includes(selectedCycleLabel));
}

function isVariableAmountRule(rule: RecurringBillRule) {
  return rule.amountMode === 'variable' || rule.amountMode === 'requires-entry';
}

function getCycleLabel(selectedDate: Date) {
  return `${formatMonthlyBillMonthName(selectedDate, 'short')} ${getMonthlyBillYear(selectedDate)}`;
}
