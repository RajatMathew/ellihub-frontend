import { useCallback, useEffect, useMemo, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Card, CardContent, CardFooter } from '@/app/components/ui/card';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { RegisterAccountSummary } from '@/modules/finance/components/register-account-summary';
import { RegisterFilters } from '@/modules/finance/components/register-filters';
import {
  REGISTER_PAGE_SIZE_OPTIONS,
  RegisterPagination,
} from '@/modules/finance/components/register-pagination';
import { RegisterTransactionsContent } from '@/modules/finance/components/register-transactions-content';
import {
  useQuickBooksRegisterAccountsQuery,
  useQuickBooksRegisterTransactionsQuery,
  useQuickBooksStatusQuery,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import type {
  QuickBooksRegisterAccount,
  QuickBooksRegisterClr,
} from '@/modules/integrations/schemas/quickbooks.schema';
import { Landmark, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CLR_VALUES: QuickBooksRegisterClr[] = ['UNCLEARED', 'CLEARED', 'RECONCILED'];

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

function getDateParam(searchParams: URLSearchParams, key: string, fallback: string) {
  const value = searchParams.get(key);
  return value && DATE_PATTERN.test(value) ? value : fallback;
}

function getPositiveIntParam(searchParams: URLSearchParams, key: string, fallback: number) {
  const value = Number(searchParams.get(key));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function getPageSize(searchParams: URLSearchParams) {
  const value = getPositiveIntParam(searchParams, 'size', 25);
  return REGISTER_PAGE_SIZE_OPTIONS.includes(value as (typeof REGISTER_PAGE_SIZE_OPTIONS)[number])
    ? value
    : 25;
}

function useRegisterSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
              next.delete(key);
              return;
            }
            next.set(key, String(value));
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return { searchParams, updateParams };
}

export default function CheckingRegisterPage() {
  const { searchParams, updateParams } = useRegisterSearchParams();
  const defaults = useMemo(() => getDefaultDateRange(), []);
  const selectedAccountId = searchParams.get('accountId') ?? '';
  const startDate = getDateParam(searchParams, 'startDate', defaults.startDate);
  const endDate = getDateParam(searchParams, 'endDate', defaults.endDate);
  const page = getPositiveIntParam(searchParams, 'page', 1);
  const size = getPageSize(searchParams);
  const clrParam = searchParams.get('clr');
  const clr = CLR_VALUES.includes(clrParam as QuickBooksRegisterClr)
    ? (clrParam as QuickBooksRegisterClr)
    : undefined;
  const transactionType = searchParams.get('transactionType') ?? undefined;
  const searchParam = searchParams.get('search') ?? '';
  const [transactionSearch, setTransactionSearch] = useState(searchParam);
  const debouncedTransactionSearch = useDebouncedValue(transactionSearch.trim(), 300);

  useEffect(() => {
    if (debouncedTransactionSearch !== searchParam) {
      updateParams({ search: debouncedTransactionSearch || null, page: 1 });
    }
  }, [debouncedTransactionSearch, searchParam, updateParams]);

  const statusQuery = useQuickBooksStatusQuery();
  const isConnected = statusQuery.data?.connection?.status === 'CONNECTED';
  const accountsQuery = useQuickBooksRegisterAccountsQuery(isConnected);
  const accounts = accountsQuery.data ?? [];
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;

  const transactionParams = selectedAccount
    ? {
        accountId: selectedAccount.id,
        startDate,
        endDate,
        search: debouncedTransactionSearch || undefined,
        clr,
        transactionType,
        page,
        size,
      }
    : undefined;
  const transactionsQuery = useQuickBooksRegisterTransactionsQuery(
    transactionParams,
    isConnected && Boolean(selectedAccount)
  );
  const transactionsResponse = transactionsQuery.data;
  const transactions = transactionsResponse?.transactions ?? [];
  const pagination = transactionsResponse?.meta.pagination;
  const isAccountsLoading = statusQuery.isLoading || accountsQuery.isLoading;
  const isInitialTransactionsLoading = transactionsQuery.isLoading && Boolean(selectedAccount);
  const isRefreshingTransactions = transactionsQuery.isFetching && !transactionsQuery.isLoading;
  const isRefreshingRegister =
    statusQuery.isFetching || accountsQuery.isFetching || transactionsQuery.isFetching;
  const hasActiveFilters = Boolean(
    debouncedTransactionSearch ||
    clr ||
    transactionType ||
    startDate !== defaults.startDate ||
    endDate !== defaults.endDate
  );

  const handleAccountSelect = (account: QuickBooksRegisterAccount) => {
    updateParams({ accountId: account.id, page: 1 });
  };

  const clearFilters = () => {
    setTransactionSearch('');
    updateParams({
      startDate: null,
      endDate: null,
      search: null,
      clr: null,
      transactionType: null,
      page: 1,
    });
  };

  const refreshRegister = () => {
    void statusQuery.refetch();
    void accountsQuery.refetch();
    if (selectedAccount) void transactionsQuery.refetch();
  };

  return (
    <div className="container-fluid py-7.5">
      <Toolbar className="mb-4 gap-3 pt-5 pb-3">
        <ToolbarWrapper>
          <ToolbarHeading className="gap-1.5">
            <ToolbarPageTitle>Checking Register</ToolbarPageTitle>
            <p className="text-sm text-muted-foreground">
              Search QuickBooks bank accounts and review register transactions
            </p>
          </ToolbarHeading>
        </ToolbarWrapper>
      </Toolbar>

      {statusQuery.isError ? (
        <Card>
          <QueryErrorState
            title="Failed to load QuickBooks status"
            onRetry={() => void statusQuery.refetch()}
            className="min-h-72"
          />
        </Card>
      ) : !isConnected && !statusQuery.isLoading ? (
        <QuickBooksDisconnectedState />
      ) : (
        <Card className="min-h-[32rem] overflow-hidden">
          <RegisterAccountSummary
            accounts={accounts}
            selectedAccount={selectedAccount}
            isLoading={isAccountsLoading}
            isError={accountsQuery.isError}
            isRefreshing={isRefreshingRegister}
            onSelect={handleAccountSelect}
            onRefresh={refreshRegister}
          />

          {selectedAccount ? (
            <>
              <CardContent className="flex flex-col gap-4 p-3 sm:p-5">
                <RegisterFilters
                  startDate={startDate}
                  endDate={endDate}
                  search={transactionSearch}
                  clr={clr}
                  transactionType={transactionType}
                  transactionTypes={transactionsResponse?.meta.transactionTypes ?? []}
                  hasActiveFilters={hasActiveFilters}
                  onSearchChange={setTransactionSearch}
                  onStartDateChange={(value) => updateParams({ startDate: value, page: 1 })}
                  onEndDateChange={(value) => updateParams({ endDate: value, page: 1 })}
                  onClrChange={(value) => updateParams({ clr: value, page: 1 })}
                  onTransactionTypeChange={(value) =>
                    updateParams({ transactionType: value, page: 1 })
                  }
                  onClearFilters={clearFilters}
                />

                <RegisterTransactionsContent
                  transactions={transactions}
                  currencyCode={selectedAccount.currencyCode}
                  isLoading={isInitialTransactionsLoading}
                  isRefreshing={isRefreshingTransactions}
                  isError={transactionsQuery.isError}
                  onRetry={() => void transactionsQuery.refetch()}
                />
              </CardContent>

              <CardFooter className="flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <RegisterPagination
                  pagination={pagination}
                  onPageChange={(nextPage) => updateParams({ page: nextPage })}
                  onSizeChange={(nextSize) => updateParams({ size: nextSize, page: 1 })}
                />
              </CardFooter>
            </>
          ) : (
            <RegisterAccountSelectionState
              isLoading={isAccountsLoading}
              isError={accountsQuery.isError}
              hasAccounts={accounts.length > 0}
              onRetry={() => void accountsQuery.refetch()}
            />
          )}
        </Card>
      )}
    </div>
  );
}

function QuickBooksDisconnectedState() {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
        <Landmark className="mb-4 size-10 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">QuickBooks is not connected</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Connect QuickBooks from integration settings to view bank accounts and register
          transactions.
        </p>
      </CardContent>
    </Card>
  );
}

function RegisterAccountSelectionState({
  isLoading,
  isError,
  hasAccounts,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  hasAccounts: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
        <Loader2 className="mb-3 size-8 animate-spin text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Loading bank accounts</p>
      </CardContent>
    );
  }

  if (isError) {
    return (
      <QueryErrorState
        title="Failed to load bank accounts"
        onRetry={onRetry}
        className="min-h-72"
      />
    );
  }

  return (
    <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
      <Landmark className="mb-3 size-8 text-muted-foreground" />
      <h2 className="text-base font-semibold text-foreground">
        {hasAccounts ? 'Select a bank account' : 'No bank accounts found'}
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {hasAccounts
          ? 'Use the searchable account selector above to load register transactions.'
          : 'Sync QuickBooks reference data, then refresh this page.'}
      </p>
    </CardContent>
  );
}
