import { useMemo, useState } from 'react';

import { CreateRecurringRuleDialog } from '@/modules/monthly-bills/components/recurring-bills/create-recurring-rule-dialog';
import { RecurringBillsStats } from '@/modules/monthly-bills/components/recurring-bills/recurring-bills-stats';
import { RecurringPayDialog } from '@/modules/monthly-bills/components/recurring-bills/recurring-pay-dialog';
import { RecurringBillsWorkspace } from '@/modules/monthly-bills/components/recurring-bills/recurring-bills-workspace';
import {
  buildRecurringBillRulesMock,
  recurringBillRulesMock,
} from '@/modules/monthly-bills/constants/recurring-bills.mock';
import type { RecurringBillRule } from '@/modules/monthly-bills/types/recurring-bills.types';
import {
  useQuickBooksBankAccountsQuery,
  useQuickBooksCategoriesQuery,
  useQuickBooksVendorsQuery,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import { toast } from 'sonner';

interface MonthlyBillsRecurringPageProps {
  selectedDate: Date;
}

export function MonthlyBillsRecurringPage({ selectedDate }: MonthlyBillsRecurringPageProps) {
  const [ruleOverrides, setRuleOverrides] = useState<RecurringBillRule[] | null>(null);
  const [search, setSearch] = useState('');
  const [createRuleOpen, setCreateRuleOpen] = useState(false);
  const [payRule, setPayRule] = useState<RecurringBillRule | null>(null);
  const vendorsQuery = useQuickBooksVendorsQuery();
  const categoriesQuery = useQuickBooksCategoriesQuery();
  const bankAccountsQuery = useQuickBooksBankAccountsQuery();
  const referenceSeededRules = useMemo(
    () =>
      vendorsQuery.isFetched && categoriesQuery.isFetched && bankAccountsQuery.isFetched
        ? buildRecurringBillRulesMock({
            vendors: vendorsQuery.data,
            categories: categoriesQuery.data,
            bankAccounts: bankAccountsQuery.data,
          })
        : recurringBillRulesMock,
    [
      bankAccountsQuery.data,
      bankAccountsQuery.isFetched,
      categoriesQuery.data,
      categoriesQuery.isFetched,
      vendorsQuery.data,
      vendorsQuery.isFetched,
    ]
  );
  const rules = ruleOverrides ?? referenceSeededRules;

  const handleCreateRule = (rule: RecurringBillRule) => {
    setRuleOverrides((current) => [rule, ...(current ?? referenceSeededRules)]);
    setCreateRuleOpen(false);
    toast.success('Recurring bill added.');
  };

  return (
    <>
      <RecurringBillsStats rules={rules} selectedDate={selectedDate} />

      <RecurringBillsWorkspace
        rules={rules}
        search={search}
        onSearchChange={setSearch}
        onCreateRule={() => setCreateRuleOpen(true)}
        onPayRule={setPayRule}
        onToggleActive={(ruleId, isActive) => {
          setRuleOverrides((current) =>
            (current ?? referenceSeededRules).map((rule) =>
              rule.id === ruleId ? { ...rule, isActive } : rule
            )
          );
        }}
      />

      <CreateRecurringRuleDialog
        open={createRuleOpen}
        onOpenChange={setCreateRuleOpen}
        onCreate={handleCreateRule}
      />

      <RecurringPayDialog
        rule={payRule}
        selectedDate={selectedDate}
        open={Boolean(payRule)}
        onOpenChange={(open) => {
          if (!open) setPayRule(null);
        }}
        onPaid={(payment) => {
          setRuleOverrides((current) =>
            (current ?? referenceSeededRules).map((rule) =>
              rule.id === payment.ruleId
                ? {
                    ...rule,
                    bankAccountId: payment.bankAccountId,
                    bankAccountName: payment.bankAccountName,
                    categoryId: payment.categoryId,
                    categoryName: payment.categoryName,
                    lastPaidAmount: payment.amount,
                    lastPaidLabel: payment.label,
                  }
                : rule
            )
          );
          toast.success('Recurring bill payment saved.');
        }}
      />
    </>
  );
}
