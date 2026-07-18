import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { CreateRecurringRuleDialog } from '@/modules/monthly-bills/components/recurring-bills/create-recurring-rule-dialog';
import { RecurringBillsStats } from '@/modules/monthly-bills/components/recurring-bills/recurring-bills-stats';
import { RecurringPayDialog } from '@/modules/monthly-bills/components/recurring-bills/recurring-pay-dialog';
import { RecurringBillsWorkspace } from '@/modules/monthly-bills/components/recurring-bills/recurring-bills-workspace';
import {
  useCreateRecurringBillRuleMutation,
  useDeleteRecurringBillRuleMutation,
  useInfiniteRecurringBillsQuery,
  usePayRecurringBillMutation,
  useSkipRecurringBillMonthMutation,
  useSkipRecurringBillMutation,
  useToggleRecurringBillRuleMutation,
  useUpdateRecurringBillRuleMutation,
} from '@/modules/monthly-bills/hooks/recurring-bills.hooks';
import {
  getMonthlyBillMonthNumber,
  getMonthlyBillYear,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import type {
  CreateRecurringBillRulePayload,
  PayRecurringBillPayload,
  RecurringBillGroup,
  RecurringBillItem,
  RecurringBillsSummary,
} from '@/modules/monthly-bills/schemas/recurring-bills.schema';

interface MonthlyBillsRecurringPageProps {
  selectedDate: Date;
}

type RecurringStatusFilter = 'all' | 'due' | 'paid' | 'skipped';

const emptySummary: RecurringBillsSummary = {
  activeCount: 0,
  pausedCount: 0,
  scheduledCount: 0,
  plannedAmount: 0,
  paidAmount: 0,
  paidCount: 0,
};

export function MonthlyBillsRecurringPage({ selectedDate }: MonthlyBillsRecurringPageProps) {
  const selectedMonth = getMonthlyBillMonthNumber(selectedDate);
  const selectedYear = getMonthlyBillYear(selectedDate);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RecurringStatusFilter>('all');
  const [createRuleOpen, setCreateRuleOpen] = useState(false);
  const [payOccurrence, setPayOccurrence] = useState<RecurringBillItem | null>(null);
  const [editRule, setEditRule] = useState<RecurringBillGroup | null>(null);
  const [skipOccurrence, setSkipOccurrence] = useState<RecurringBillItem | null>(null);
  const [skipMonthRule, setSkipMonthRule] = useState<RecurringBillGroup | null>(null);
  const [deleteRule, setDeleteRule] = useState<RecurringBillGroup | null>(null);
  const createRule = useCreateRecurringBillRuleMutation();
  const updateRule = useUpdateRecurringBillRuleMutation();
  const toggleRule = useToggleRecurringBillRuleMutation();
  const skipRecurringBill = useSkipRecurringBillMutation();
  const skipRecurringBillMonth = useSkipRecurringBillMonthMutation();
  const deleteRecurringBill = useDeleteRecurringBillRuleMutation();
  const payRecurringBill = usePayRecurringBillMutation();
  const queryParams = useMemo(
    () => ({
      month: selectedMonth,
      year: selectedYear,
      size: 25,
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : [status],
    }),
    [search, selectedMonth, selectedYear, status]
  );
  const recurringBillsQuery = useInfiniteRecurringBillsQuery(queryParams);
  const pages = recurringBillsQuery.data?.pages ?? [];
  const groups = pages.flatMap((page) => page.groups);
  const meta = pages[0]?.meta;

  if (recurringBillsQuery.isLoading) {
    return <RecurringBillsLoading />;
  }

  return (
    <>
      <RecurringBillsStats summary={meta?.summary ?? emptySummary} />

      <RecurringBillsWorkspace
        groups={groups}
        search={search}
        status={status}
        canUpdateBills={meta?.capabilities.canUpdateBills ?? false}
        canMarkPayment={(meta?.capabilities.canMarkPayment ?? false) && (meta?.period.isCurrent ?? false)}
        hasNextPage={recurringBillsQuery.hasNextPage}
        isFetchingNextPage={recurringBillsQuery.isFetchingNextPage}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onCreateRule={() => setCreateRuleOpen(true)}
        onPayOccurrence={setPayOccurrence}
        onEditRule={setEditRule}
        onSkipOccurrence={setSkipOccurrence}
        onSkipMonth={setSkipMonthRule}
        onDeleteRule={setDeleteRule}
        onToggleActive={(ruleId, isActive) => {
          toggleRule.mutate({ ruleId, isActive });
        }}
        onFetchNextPage={() => {
          void recurringBillsQuery.fetchNextPage();
        }}
      />

      <CreateRecurringRuleDialog
        open={createRuleOpen || Boolean(editRule)}
        rule={editRule}
        selectedDate={selectedDate}
        isSaving={createRule.isPending || updateRule.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setCreateRuleOpen(false);
            setEditRule(null);
          } else if (!editRule) {
            setCreateRuleOpen(true);
          }
        }}
        onCreate={async (payload: CreateRecurringBillRulePayload) => {
          await createRule.mutateAsync(payload);
          setCreateRuleOpen(false);
        }}
        onUpdate={async (ruleId: string, payload: CreateRecurringBillRulePayload) => {
          await updateRule.mutateAsync({ ruleId, payload });
          setEditRule(null);
        }}
      />

      <RecurringPayDialog
        rule={payOccurrence}
        open={Boolean(payOccurrence)}
        isSaving={payRecurringBill.isPending}
        onOpenChange={(open) => {
          if (!open) setPayOccurrence(null);
        }}
        onPaid={async (ruleId: string, payload: PayRecurringBillPayload) => {
          await payRecurringBill.mutateAsync({ ruleId, payload });
          setPayOccurrence(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(skipOccurrence)}
        onOpenChange={(open) => !open && setSkipOccurrence(null)}
        title="Skip Recurring Bill?"
        description={
          <>
            This will mark <strong>{skipOccurrence?.name}</strong> as skipped for this cycle only.
            The rule will stay active for future cycles.
          </>
        }
        confirmLabel="Skip bill"
        onConfirm={() => {
          if (!skipOccurrence) return;
          skipRecurringBill.mutate(
            {
              ruleId: skipOccurrence.ruleId,
              payload: {
                cycleKey: skipOccurrence.cycleKey,
                dueDate: skipOccurrence.dueDate,
                reason: '',
              },
            },
            { onSuccess: () => setSkipOccurrence(null) }
          );
        }}
        isPending={skipRecurringBill.isPending}
      />

      <ConfirmDialog
        open={Boolean(skipMonthRule)}
        onOpenChange={(open) => !open && setSkipMonthRule(null)}
        title="Skip This Month?"
        description={
          <>
            This will skip all unpaid <strong>{skipMonthRule?.name}</strong> occurrences in the
            selected month. Paid transactions will stay unchanged.
          </>
        }
        confirmLabel="Skip month"
        onConfirm={() => {
          if (!skipMonthRule) return;
          skipRecurringBillMonth.mutate(
            {
              ruleId: skipMonthRule.ruleId,
              payload: {
                month: selectedMonth,
                year: selectedYear,
                reason: '',
              },
            },
            { onSuccess: () => setSkipMonthRule(null) }
          );
        }}
        isPending={skipRecurringBillMonth.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteRule)}
        onOpenChange={(open) => !open && setDeleteRule(null)}
        title="Delete Recurring Bill?"
        description={
          <>
            This will stop <strong>{deleteRule?.name}</strong> from appearing in future recurring
            bill cycles. Existing paid history will remain.
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (!deleteRule) return;
          deleteRecurringBill.mutate(deleteRule.ruleId, { onSuccess: () => setDeleteRule(null) });
        }}
        isPending={deleteRecurringBill.isPending}
      />
    </>
  );
}

function RecurringBillsLoading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
