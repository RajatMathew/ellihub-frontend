import { TableCardHeader, TableCardHeaderSearch } from '@/app/components/table-card-header';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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
import { formatDateOnlyLabel } from '@/modules/monthly-bills/lib/monthly-bills-date';
import type {
  RecurringBillFrequency,
  RecurringBillRule,
} from '@/modules/monthly-bills/types/recurring-bills.types';
import {
  Ban,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';

type RecurringBillRowState = 'payable' | 'paid' | 'skipped' | 'disabled';
export type RecurringStatusFilter = 'all' | 'due' | 'paid' | 'skipped';

interface RecurringBillsWorkspaceProps {
  rules: RecurringBillRule[];
  search: string;
  status: RecurringStatusFilter;
  canUpdateBills: boolean;
  canMarkPayment: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: RecurringStatusFilter) => void;
  onCreateRule: () => void;
  onPayRule: (rule: RecurringBillRule) => void;
  onEditRule: (rule: RecurringBillRule) => void;
  onSkipRule: (rule: RecurringBillRule) => void;
  onDeleteRule: (rule: RecurringBillRule) => void;
  onToggleActive: (ruleId: string, isActive: boolean) => void;
  onFetchNextPage?: () => void;
}

const statusOptions: { value: RecurringStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'due', label: 'Due' },
  { value: 'paid', label: 'Paid' },
  { value: 'skipped', label: 'Skipped' },
];

export function RecurringBillsWorkspace({
  rules,
  search,
  status,
  canUpdateBills,
  canMarkPayment,
  hasNextPage = false,
  isFetchingNextPage = false,
  onSearchChange,
  onStatusChange,
  onCreateRule,
  onPayRule,
  onEditRule,
  onSkipRule,
  onDeleteRule,
  onToggleActive,
  onFetchNextPage,
}: RecurringBillsWorkspaceProps) {
  const hasActiveFilters = Boolean(search) || status !== 'all';

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
            <Select
              value={status}
              onValueChange={(value) => onStatusChange(value as RecurringStatusFilter)}
            >
              <SelectTrigger className="h-9 w-full border-table-card-header-foreground/25 bg-card-header text-table-card-header-foreground hover:border-table-card-header-foreground/40 xl:w-44 [&_svg]:text-table-card-header-foreground">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent align="end">
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canUpdateBills && (
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
            )}
          </div>
        }
      />

      {rules.length === 0 ? (
        <RecurringBillsEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            onSearchChange('');
            onStatusChange('all');
          }}
        />
      ) : (
        <div className="border-t">
          <Table className="min-w-[78rem]">
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
                <TableHead className="h-10 min-w-32 text-xs font-semibold uppercase tracking-normal">
                  Due
                </TableHead>
                <TableHead className="h-10 min-w-40 text-xs font-semibold uppercase tracking-normal">
                  Amount
                </TableHead>
                <TableHead className="h-10 min-w-36 text-center text-xs font-semibold uppercase tracking-normal">
                  Status
                </TableHead>
                <TableHead className="h-10 w-24 text-center text-xs font-semibold uppercase tracking-normal">
                  Active
                </TableHead>
                <TableHead className="h-10 w-16 text-right text-xs font-semibold uppercase tracking-normal">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => {
                const rowState = getRowState(rule);

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
                    <TableCell className="min-w-32 py-3 text-sm text-foreground">
                      {formatDateOnlyLabel(rule.dueDate, { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="min-w-40 py-3">
                      <RecurringBillAmountCell rule={rule} rowState={rowState} />
                    </TableCell>
                    <TableCell className="min-w-36 py-3 text-center">
                      <RecurringBillRowAction
                        rule={rule}
                        rowState={rowState}
                        canMarkPayment={canMarkPayment}
                        onPayRule={onPayRule}
                      />
                    </TableCell>
                    <TableCell className="w-24 py-3 text-center">
                      <Switch
                        size="sm"
                        checked={rule.isActive}
                        disabled={!canUpdateBills}
                        onCheckedChange={(isActive) => onToggleActive(rule.ruleId, isActive)}
                        aria-label={`Toggle ${rule.name}`}
                      />
                    </TableCell>
                    <TableCell className="w-16 py-3 text-right">
                      <RecurringBillActionsMenu
                        rule={rule}
                        rowState={rowState}
                        canUpdateBills={canUpdateBills}
                        onEditRule={onEditRule}
                        onSkipRule={onSkipRule}
                        onDeleteRule={onDeleteRule}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {hasNextPage && (
            <div className="flex justify-center border-t p-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetchingNextPage}
                onClick={onFetchNextPage}
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function RecurringBillRowAction({
  rule,
  rowState,
  canMarkPayment,
  onPayRule,
}: {
  rule: RecurringBillRule;
  rowState: RecurringBillRowState;
  canMarkPayment: boolean;
  onPayRule: (rule: RecurringBillRule) => void;
}) {
  if (rowState === 'paid') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="success" appearance="light" size="md" className="h-8 px-3">
          <CheckCircle2 className="size-3.5" />
          Paid
        </Badge>
        {rule.payment?.transactionUrl && (
          <a
            href={rule.payment.transactionUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Transaction <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    );
  }

  if (rowState === 'skipped') {
    return (
      <Badge variant="secondary" appearance="light" size="md" className="h-8 px-3">
        Skipped
      </Badge>
    );
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      disabled={!rule.isActive || !canMarkPayment}
      onClick={() => onPayRule(rule)}
    >
      <CreditCard className="size-3.5" />
      Pay
    </Button>
  );
}

function RecurringBillActionsMenu({
  rule,
  rowState,
  canUpdateBills,
  onEditRule,
  onSkipRule,
  onDeleteRule,
}: {
  rule: RecurringBillRule;
  rowState: RecurringBillRowState;
  canUpdateBills: boolean;
  onEditRule: (rule: RecurringBillRule) => void;
  onSkipRule: (rule: RecurringBillRule) => void;
  onDeleteRule: (rule: RecurringBillRule) => void;
}) {
  const canSkip = canUpdateBills && rowState === 'payable';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" mode="icon" size="sm" aria-label={`Actions for ${rule.name}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          disabled={!canUpdateBills || !isSupportedFormFrequency(rule.frequency)}
          onClick={() => onEditRule(rule)}
        >
          <Pencil className="size-4" />
          Edit rule
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canSkip} onClick={() => onSkipRule(rule)}>
          <Ban className="size-4" />
          Skip this cycle
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={!canUpdateBills}
          onClick={() => onDeleteRule(rule)}
        >
          <Trash2 className="size-4" />
          Delete rule
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecurringBillAmountCell({
  rule,
  rowState,
}: {
  rule: RecurringBillRule;
  rowState: RecurringBillRowState;
}) {
  if (rowState === 'paid') {
    return (
      <>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(rule.payment?.amount ?? rule.defaultAmount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid{' '}
          {rule.payment
            ? formatDateOnlyLabel(rule.payment.txnDate)
            : formatDateOnlyLabel(rule.dueDate)}
        </p>
      </>
    );
  }

  if (isVariableAmountRule(rule)) {
    return (
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {rule.defaultAmount > 0 ? formatCurrency(rule.defaultAmount) : 'Needs amount'}{' '}
        <span className="text-xs font-normal text-muted-foreground">expected</span>
      </p>
    );
  }

  return (
    <p className="text-sm font-semibold tabular-nums text-foreground">
      {rule.defaultAmount > 0 ? formatCurrency(rule.defaultAmount) : 'Needs amount'}
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
            {hasActiveFilters
              ? 'Clear the search or choose another filter.'
              : 'Add a recurring bill to start tracking it.'}
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
  if (frequency === 'custom') return 'Custom';
  if (frequency === 'biweekly') return 'Every 2 weeks';
  return frequency.charAt(0).toUpperCase() + frequency.slice(1);
}

function getRowState(rule: RecurringBillRule): RecurringBillRowState {
  if (!rule.isActive) return 'disabled';
  if (rule.status === 'paid') return 'paid';
  if (rule.status === 'skipped') return 'skipped';
  return 'payable';
}

function isVariableAmountRule(rule: RecurringBillRule) {
  return rule.amountMode === 'variable';
}

function isSupportedFormFrequency(frequency: RecurringBillFrequency) {
  return frequency === 'weekly' || frequency === 'monthly' || frequency === 'custom';
}

