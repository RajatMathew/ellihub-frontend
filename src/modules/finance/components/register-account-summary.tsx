import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import { RegisterAccountCombobox } from '@/modules/finance/components/register-account-combobox';
import {
  formatRegisterDate,
  formatRegisterMoney,
  getRegisterAmountClassName,
} from '@/modules/finance/lib/checking-register.utils';
import type { QuickBooksRegisterAccount } from '@/modules/integrations/schemas/quickbooks.schema';
import { Loader2, RefreshCcw } from 'lucide-react';

interface RegisterAccountSummaryProps {
  accounts: QuickBooksRegisterAccount[];
  selectedAccount: QuickBooksRegisterAccount | null;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  onSelect: (account: QuickBooksRegisterAccount) => void;
  onRefresh: () => void;
}

export function RegisterAccountSummary({
  accounts,
  selectedAccount,
  isLoading,
  isError,
  isRefreshing,
  onSelect,
  onRefresh,
}: RegisterAccountSummaryProps) {
  return (
    <section
      aria-label="Checking account summary"
      className="grid gap-5 border-b border-card-border px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
    >
      <div className="min-w-0">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Checking account
        </p>
        <RegisterAccountCombobox
          accounts={accounts}
          selectedAccount={selectedAccount}
          isLoading={isLoading}
          isError={isError}
          onSelect={onSelect}
        />
      </div>

      <div className="flex min-w-0 flex-col items-start gap-2 lg:items-end lg:text-right">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Current balance
          </p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-44" />
          ) : (
            <p
              className={cn(
                'mt-1 break-words text-2xl font-semibold tabular-nums sm:text-3xl',
                selectedAccount
                  ? getRegisterAmountClassName(selectedAccount.currentBalance)
                  : 'text-muted-foreground'
              )}
            >
              {selectedAccount
                ? formatRegisterMoney(selectedAccount.currentBalance, selectedAccount.currencyCode)
                : '-'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span className="text-xs text-muted-foreground">
            {selectedAccount?.lastSyncedAt
              ? `Last synced ${formatRegisterDate(selectedAccount.lastSyncedAt)}`
              : selectedAccount
                ? 'Sync time unavailable'
                : 'Select an account to view transactions'}
          </span>
          <Button variant="outline" size="sm" disabled={isRefreshing} onClick={onRefresh}>
            {isRefreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>
    </section>
  );
}
