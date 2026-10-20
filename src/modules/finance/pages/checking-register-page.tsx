import { useMemo } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { ListPageHeader } from '@/app/components/page-header';
import { QueryErrorState } from '@/app/components/query-error-state';
import { Card, CardContent } from '@/app/components/ui/card';
import { RegisterAccountSummary } from '@/modules/finance/components/register-account-summary';
import { useRegisterTransactionColumns } from '@/modules/finance/components/register-transaction-columns';
import { RegisterTransactionMobileCard } from '@/modules/finance/components/register-transaction-mobile-card';
import {
  REGISTER_CLR_OPTIONS,
  REGISTER_DATE_PRESETS,
  REGISTER_DEFAULT_PAGE_SIZE,
} from '@/modules/finance/constants/checking-register.constants';
import { getDefaultRegisterRange } from '@/modules/finance/lib/checking-register.utils';
import type { ListQuickBooksRegisterTransactionsParams } from '@/modules/integrations/api/quickbooks.api';
import {
  useQuickBooksRegisterAccountsQuery,
  useQuickBooksRegisterTransactionsQuery,
  useQuickBooksStatusQuery,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import type { QuickBooksRegisterAccount } from '@/modules/integrations/schemas/quickbooks.schema';
import { Landmark, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

/**
 * The register's filters.
 *
 * No `sort`: the QuickBooks General Ledger report returns one fixed order and
 * the endpoint takes no sort params, so no column offers a sort control.
 *
 * The date range carries no `defaultValue` on purpose — the fallback window
 * rolls with today, which a fixed string cannot express. It is applied when the
 * request is built instead, so an untouched register keeps both date params out
 * of the URL and Clear stays hidden until the user has actually filtered.
 */
const REGISTER_FILTERS = [
  f.search({
    className: 'sm:w-64',
    placeholder: 'Search payee, category, memo...',
  }),
  f.dateRangePopover({
    description: 'Defaults to the last 90 days.',
    key: 'startDate',
    label: 'Dates',
    placeholder: 'Date range',
    presets: REGISTER_DATE_PRESETS,
    toKey: 'endDate',
  }),
  f.select({
    key: 'clr',
    label: 'CLR',
    options: REGISTER_CLR_OPTIONS,
    placeholder: 'All CLR',
  }),
  f.select({
    key: 'transactionType',
    label: 'Type',
    options: [],
    placeholder: 'All types',
  }),
];

export default function CheckingRegisterPage() {
  // The account is navigation, not a filter: it decides whether the list can
  // exist at all, and Clear must not unpick it.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAccountId = searchParams.get('accountId') ?? '';

  const state = useListState({
    filters: REGISTER_FILTERS,
    pageSize: REGISTER_DEFAULT_PAGE_SIZE,
  });

  const statusQuery = useQuickBooksStatusQuery();
  const isConnected = statusQuery.data?.connection?.status === 'CONNECTED';
  const accountsQuery = useQuickBooksRegisterAccountsQuery(isConnected);
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;

  // One window per mount, so a register left open overnight does not silently
  // re-scope itself.
  const defaultRange = useMemo(() => getDefaultRegisterRange(), []);

  const transactionParams = useMemo(() => {
    if (!selectedAccount) return undefined;

    const { search, startDate, endDate, ...rest } = state.apiParams;

    return {
      ...rest,
      accountId: selectedAccount.id,
      endDate: (endDate as string | undefined) ?? defaultRange.endDate,
      search: typeof search === 'string' ? search.trim() || undefined : undefined,
      startDate: (startDate as string | undefined) ?? defaultRange.startDate,
    } as ListQuickBooksRegisterTransactionsParams;
  }, [defaultRange, selectedAccount, state.apiParams]);

  const transactionsQuery = useQuickBooksRegisterTransactionsQuery(
    transactionParams,
    isConnected && Boolean(selectedAccount)
  );
  const response = transactionsQuery.data;

  // The type list is whatever this account's window actually contains, so the
  // options arrive with the rows rather than from a schema literal.
  const transactionTypes = response?.meta.transactionTypes;
  const filters = useMemo(
    () =>
      REGISTER_FILTERS.map((def) =>
        def.kind === 'select' && def.key === 'transactionType'
          ? {
              ...def,
              options: (transactionTypes ?? []).map((type) => ({ label: type, value: type })),
            }
          : def
      ),
    [transactionTypes]
  );

  const columns = useRegisterTransactionColumns(selectedAccount?.currencyCode ?? null);

  const list = useListTable({
    columns,
    // The account has to resolve before the list means anything, and its own
    // query is what resolves it.
    extraLoading: statusQuery.isLoading || accountsQuery.isLoading,
    getRowId: (transaction) => transaction.id,
    query: transactionsQuery,
    rows: response?.transactions ?? [],
    state,
    totalCount: response?.meta.pagination.totalItems ?? 0,
  });

  const isAccountsLoading = statusQuery.isLoading || accountsQuery.isLoading;
  const isRefreshingRegister =
    statusQuery.isFetching || accountsQuery.isFetching || transactionsQuery.isFetching;

  const handleAccountSelect = (account: QuickBooksRegisterAccount) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('accountId', account.id);
        next.delete('page');
        return next;
      },
      { replace: true }
    );
  };

  const refreshRegister = () => {
    void statusQuery.refetch();
    void accountsQuery.refetch();
    if (selectedAccount) void transactionsQuery.refetch();
  };

  return (
    <div className="container-fluid py-7.5">
      <ListPageHeader
        title="Checking Register"
        description={
          <span className="text-sm text-muted-foreground">
            Search QuickBooks bank accounts and review register transactions
          </span>
        }
      />

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
        <DataTable
          ariaLabel="Register transactions"
          banner={
            <RegisterAccountSummary
              accounts={accounts}
              isError={accountsQuery.isError}
              isLoading={isAccountsLoading}
              isRefreshing={isRefreshingRegister}
              selectedAccount={selectedAccount}
              onRefresh={refreshRegister}
              onSelect={handleAccountSelect}
            />
          }
          className="min-h-[32rem] overflow-hidden"
          empty={{
            description: 'This account has no transactions in the selected window.',
            icon: Landmark,
            title: 'No transactions found',
          }}
          error={{ title: 'Failed to load transactions.' }}
          filteredEmpty={{ description: 'Adjust the date range, search, or filters.' }}
          filters={filters}
          list={list}
          mobileItem={(transaction) => (
            <RegisterTransactionMobileCard
              currencyCode={selectedAccount?.currencyCode ?? null}
              transaction={transaction}
            />
          )}
          // Until an account is picked there is no list to filter, page or empty
          // — only a prompt to pick one.
          replaceBody={
            selectedAccount ? undefined : (
              <RegisterAccountSelectionState
                hasAccounts={accounts.length > 0}
                isError={accountsQuery.isError}
                isLoading={isAccountsLoading}
                onRetry={() => void accountsQuery.refetch()}
              />
            )
          }
          state={state}
          title="Transactions"
        />
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
