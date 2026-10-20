import {
  TableCardHeader,
  TableCardHeaderFilters,
  TableCardHeaderSearch,
  TableCardHeaderTitle,
  TableCardHeaderTrailing,
} from '@/app/components/table-card-header';
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
import { formatDateOnly } from '@/app/lib/dates';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import type { RecurringBillItem } from '@/modules/monthly-bills/schemas/recurring-bills.schema';
import type {
  RecurringBillFrequency,
  RecurringBillRuleGroup,
} from '@/modules/monthly-bills/types/recurring-bills.types';
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';

type RecurringBillRowState = 'payable' | 'paid' | 'skipped' | 'disabled';
export type RecurringStatusFilter = 'all' | 'due' | 'paid' | 'skipped';

interface RecurringBillsWorkspaceProps {
  groups: RecurringBillRuleGroup[];
  search: string;
  status: RecurringStatusFilter;
  canUpdateBills: boolean;
  canMarkPayment: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: RecurringStatusFilter) => void;
  onCreateRule: () => void;
  onPayOccurrence: (occurrence: RecurringBillItem) => void;
  onEditRule: (group: RecurringBillRuleGroup) => void;
  onSkipOccurrence: (occurrence: RecurringBillItem) => void;
  onSkipMonth: (group: RecurringBillRuleGroup) => void;
  onDeleteRule: (group: RecurringBillRuleGroup) => void;
  onToggleActive: (ruleId: string, isActive: boolean) => void;
  onFetchNextPage?: () => void;
}

const statusOptions: { value: RecurringStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'due', label: 'Due' },
  { value: 'paid', label: 'Paid' },
  { value: 'skipped', label: 'Skipped' },
];

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RecurringBillsWorkspace({
  groups,
  search,
  status,
  canUpdateBills,
  canMarkPayment,
  hasNextPage = false,
  isFetchingNextPage = false,
  onSearchChange,
  onStatusChange,
  onCreateRule,
  onPayOccurrence,
  onEditRule,
  onSkipOccurrence,
  onSkipMonth,
  onDeleteRule,
  onToggleActive,
  onFetchNextPage,
}: RecurringBillsWorkspaceProps) {
  const hasActiveFilters = Boolean(search) || status !== 'all';

  return (
    <Card className="overflow-hidden">
      <TableCardHeader
        title={<TableCardHeaderTitle>Recurring Bills</TableCardHeaderTitle>}
        actions={
          <TableCardHeaderFilters>
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
              <SelectTrigger size="toolbar" className="w-full shadow-xs shadow-black/10 xl:w-44">
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
          </TableCardHeaderFilters>
        }
        trailing={
          canUpdateBills ? (
            <TableCardHeaderTrailing>
              <Button type="button" variant="outline" size="toolbar" onClick={onCreateRule}>
                <Plus />
                Add recurring bill
              </Button>
            </TableCardHeaderTrailing>
          ) : undefined
        }
      />

      {groups.length === 0 ? (
        <RecurringBillsEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            onSearchChange('');
            onStatusChange('all');
          }}
        />
      ) : (
        <div className="divide-y border-t">
          {groups.map((group) => (
            <RecurringBillSection
              key={group.ruleId}
              group={group}
              canUpdateBills={canUpdateBills}
              canMarkPayment={canMarkPayment}
              onPayOccurrence={onPayOccurrence}
              onEditRule={onEditRule}
              onSkipOccurrence={onSkipOccurrence}
              onSkipMonth={onSkipMonth}
              onDeleteRule={onDeleteRule}
              onToggleActive={onToggleActive}
            />
          ))}

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

function RecurringBillSection({
  group,
  canUpdateBills,
  canMarkPayment,
  onPayOccurrence,
  onEditRule,
  onSkipOccurrence,
  onSkipMonth,
  onDeleteRule,
  onToggleActive,
}: {
  group: RecurringBillRuleGroup;
  canUpdateBills: boolean;
  canMarkPayment: boolean;
  onPayOccurrence: (occurrence: RecurringBillItem) => void;
  onEditRule: (group: RecurringBillRuleGroup) => void;
  onSkipOccurrence: (occurrence: RecurringBillItem) => void;
  onSkipMonth: (group: RecurringBillRuleGroup) => void;
  onDeleteRule: (group: RecurringBillRuleGroup) => void;
  onToggleActive: (ruleId: string, isActive: boolean) => void;
}) {
  const hasOccurrences = group.occurrences.length > 0;

  return (
    <section className="bg-card">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="min-w-0 break-words text-base font-semibold leading-6 text-foreground">
                {group.name}
              </h3>
              {!group.isActive && (
                <Badge variant="secondary" appearance="light" size="sm">
                  Paused
                </Badge>
              )}
              {group.summary.isCompleteForPeriod && (
                <Badge variant="success" appearance="light" size="sm">
                  Complete
                </Badge>
              )}
              {isVariableAmountRule(group) && (
                <Badge variant="warning" appearance="light" size="sm">
                  Variable
                </Badge>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="min-w-0 break-words">{group.vendorName}</span>
              <span className="inline-flex items-center gap-1.5">
                <Repeat className="size-3.5" />
                {getFrequencyLabel(group.frequency)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {getScheduleLabel(group)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="min-w-32 rounded-md border bg-muted/20 px-3 py-2 text-right">
              <p className="text-xs font-medium uppercase text-muted-foreground">Planned</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(group.summary.plannedAmount)}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Active</span>
              <Switch
                size="sm"
                checked={group.isActive}
                disabled={!canUpdateBills}
                onCheckedChange={(isActive) => onToggleActive(group.ruleId, isActive)}
                aria-label={`Toggle ${group.name}`}
              />
            </div>
            <RecurringBillGroupActionsMenu
              group={group}
              canUpdateBills={canUpdateBills}
              onEditRule={onEditRule}
              onSkipMonth={onSkipMonth}
              onDeleteRule={onDeleteRule}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryPill label="Scheduled" value={String(group.summary.occurrenceCount)} />
          <SummaryPill label="Due" value={String(group.summary.dueCount)} />
          <SummaryPill label="Paid" value={String(group.summary.paidCount)} />
          <SummaryPill label="Skipped" value={String(group.summary.skippedCount)} />
        </div>

        {hasOccurrences ? (
          <div className="space-y-2">
            {group.occurrences.map((occurrence) => (
              <RecurringBillOccurrenceRow
                key={occurrence.id}
                group={group}
                occurrence={occurrence}
                canMarkPayment={canMarkPayment}
                canUpdateBills={canUpdateBills}
                onPayOccurrence={onPayOccurrence}
                onSkipOccurrence={onSkipOccurrence}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
            No payment due in this period.
          </div>
        )}
      </div>
    </section>
  );
}

function RecurringBillOccurrenceRow({
  group,
  occurrence,
  canMarkPayment,
  canUpdateBills,
  onPayOccurrence,
  onSkipOccurrence,
}: {
  group: RecurringBillRuleGroup;
  occurrence: RecurringBillItem;
  canMarkPayment: boolean;
  canUpdateBills: boolean;
  onPayOccurrence: (occurrence: RecurringBillItem) => void;
  onSkipOccurrence: (occurrence: RecurringBillItem) => void;
}) {
  const rowState = getRowState(group, occurrence);

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 rounded-md border bg-background p-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(9rem,1fr)_auto] sm:items-center',
        rowState === 'disabled' && 'opacity-70'
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">Due date</p>
        <p className="text-sm font-semibold text-foreground">
          {formatDateOnly(occurrence.dueDate, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
      <RecurringBillAmountCell rule={occurrence} rowState={rowState} />
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <RecurringBillRowAction
          occurrence={occurrence}
          rowState={rowState}
          canMarkPayment={canMarkPayment}
          onPayOccurrence={onPayOccurrence}
        />
        <RecurringBillOccurrenceActionsMenu
          occurrence={occurrence}
          rowState={rowState}
          canUpdateBills={canUpdateBills}
          onSkipOccurrence={onSkipOccurrence}
        />
      </div>
    </div>
  );
}

function RecurringBillRowAction({
  occurrence,
  rowState,
  canMarkPayment,
  onPayOccurrence,
}: {
  occurrence: RecurringBillItem;
  rowState: RecurringBillRowState;
  canMarkPayment: boolean;
  onPayOccurrence: (occurrence: RecurringBillItem) => void;
}) {
  if (rowState === 'paid') {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <Badge variant="success" appearance="light" size="md" className="h-8 px-3">
          <CheckCircle2 className="size-3.5" />
          Paid
        </Badge>
        {occurrence.payment?.transactionUrl && (
          <a
            href={occurrence.payment.transactionUrl}
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
      disabled={rowState !== 'payable' || !canMarkPayment}
      onClick={() => onPayOccurrence(occurrence)}
    >
      <CreditCard className="size-3.5" />
      Pay
    </Button>
  );
}

function RecurringBillGroupActionsMenu({
  group,
  canUpdateBills,
  onEditRule,
  onSkipMonth,
  onDeleteRule,
}: {
  group: RecurringBillRuleGroup;
  canUpdateBills: boolean;
  onEditRule: (group: RecurringBillRuleGroup) => void;
  onSkipMonth: (group: RecurringBillRuleGroup) => void;
  onDeleteRule: (group: RecurringBillRuleGroup) => void;
}) {
  const canSkipMonth = canUpdateBills && group.summary.dueCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          mode="icon"
          size="sm"
          aria-label={`Actions for ${group.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          disabled={!canUpdateBills || !isSupportedFormFrequency(group.frequency)}
          onClick={() => onEditRule(group)}
        >
          <Pencil className="size-4" />
          Edit rule
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canSkipMonth} onClick={() => onSkipMonth(group)}>
          <Ban className="size-4" />
          Skip this month
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={!canUpdateBills}
          onClick={() => onDeleteRule(group)}
        >
          <Trash2 className="size-4" />
          Delete rule
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecurringBillOccurrenceActionsMenu({
  occurrence,
  rowState,
  canUpdateBills,
  onSkipOccurrence,
}: {
  occurrence: RecurringBillItem;
  rowState: RecurringBillRowState;
  canUpdateBills: boolean;
  onSkipOccurrence: (occurrence: RecurringBillItem) => void;
}) {
  const canSkip = canUpdateBills && rowState === 'payable';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          mode="icon"
          size="sm"
          aria-label={`Cycle actions for ${occurrence.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem disabled={!canSkip} onClick={() => onSkipOccurrence(occurrence)}>
          <Ban className="size-4" />
          Skip this cycle
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecurringBillAmountCell({
  rule,
  rowState,
}: {
  rule: RecurringBillItem;
  rowState: RecurringBillRowState;
}) {
  if (rowState === 'paid') {
    return (
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">Amount</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(rule.payment?.amount ?? rule.defaultAmount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid {rule.payment ? formatDateOnly(rule.payment.txnDate) : formatDateOnly(rule.dueDate)}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase text-muted-foreground">Amount</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {rule.defaultAmount > 0 ? formatCurrency(rule.defaultAmount) : 'Needs amount'}
        {isVariableAmountRule(rule) && (
          <span className="text-xs font-normal text-muted-foreground"> expected</span>
        )}
      </p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
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

function getScheduleLabel(group: RecurringBillRuleGroup) {
  if (group.frequency === 'weekly' || group.frequency === 'biweekly') {
    const dayIndex = group.weeklyDay === 7 ? 0 : (group.weeklyDay ?? 1);
    return weekdayLabels[dayIndex] ?? 'Weekly';
  }

  if (group.frequency === 'custom') {
    return `Every ${group.customIntervalMonths ?? 1} months`;
  }

  if (group.scheduleTiming === 'start') return 'Start of month';
  if (group.scheduleTiming === 'end') return 'End of month';
  return `Day ${group.dueDay}`;
}

function getRowState(
  group: RecurringBillRuleGroup,
  occurrence: RecurringBillItem
): RecurringBillRowState {
  if (!group.isActive || !occurrence.isActive) return 'disabled';
  if (occurrence.status === 'paid') return 'paid';
  if (occurrence.status === 'skipped') return 'skipped';
  return 'payable';
}

function isVariableAmountRule(rule: RecurringBillItem | RecurringBillRuleGroup) {
  return rule.amountMode === 'variable';
}

function isSupportedFormFrequency(frequency: RecurringBillFrequency) {
  return frequency === 'weekly' || frequency === 'monthly' || frequency === 'custom';
}
