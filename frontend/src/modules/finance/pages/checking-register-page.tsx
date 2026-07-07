import { useCallback, useEffect, useMemo, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTitle,
  CardToolbar,
} from '@/app/components/ui/card';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import {
  useQuickBooksRegisterAccountsQuery,
  useQuickBooksRegisterTransactionsQuery,
  useQuickBooksStatusQuery,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import type {
  QuickBooksRegisterAccount,
  QuickBooksRegisterClr,
  QuickBooksRegisterTransaction,
} from '@/modules/integrations/schemas/quickbooks.schema';
import { ArrowLeft, Landmark, Loader2, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const ALL_VALUE = '__all__';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const CLR_OPTIONS: Array<{ value: QuickBooksRegisterClr; label: string }> = [
  { value: 'UNCLEARED', label: 'Uncleared' },
  { value: 'CLEARED', label: 'Cleared' },
  { value: 'RECONCILED', label: 'Reconciled' },
];

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
  return PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number]) ? value : 25;
}

function formatMoney(value: string | null | undefined, currencyCode?: string | null) {
  if (value == null || value === '') return '-';
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getClrLabel(value: QuickBooksRegisterClr | null) {
  if (value === 'CLEARED') return 'Cleared';
  if (value === 'RECONCILED') return 'Reconciled';
  if (value === 'UNCLEARED') return 'Uncleared';
  return '-';
}

function getClrBadgeVariant(value: QuickBooksRegisterClr | null) {
  if (value === 'RECONCILED') return 'success';
  if (value === 'CLEARED') return 'info';
  return 'secondary';
}

function getAmountClassName(value: string | null) {
  const numeric = Number(value ?? 0);
  if (numeric < 0) return 'text-destructive';
  if (numeric > 0) return 'text-success-foreground';
  return 'text-foreground';
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
  const defaults = useMemo(getDefaultDateRange, []);
  const selectedAccountId = searchParams.get('accountId') ?? '';
  const startDate = getDateParam(searchParams, 'startDate', defaults.startDate);
  const endDate = getDateParam(searchParams, 'endDate', defaults.endDate);
  const page = getPositiveIntParam(searchParams, 'page', 1);
  const size = getPageSize(searchParams);
  const clrParam = searchParams.get('clr');
  const clr = CLR_OPTIONS.some((option) => option.value === clrParam)
    ? (clrParam as QuickBooksRegisterClr)
    : undefined;
  const transactionType = searchParams.get('transactionType') ?? undefined;
  const searchParam = searchParams.get('search') ?? '';
  const [bankSearch, setBankSearch] = useState('');
  const [transactionSearch, setTransactionSearch] = useState(searchParam);
  const debouncedTransactionSearch = useDebouncedValue(transactionSearch.trim(), 300);

  useEffect(() => {
    setTransactionSearch(searchParam);
  }, [searchParam]);

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
  const filteredAccounts = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    if (!query) return accounts;

    return accounts.filter((account) =>
      [account.name, account.fullyQualifiedName, account.accountSubType, account.currencyCode]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [accounts, bankSearch]);

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
  const isInitialTransactionsLoading = transactionsQuery.isLoading && Boolean(selectedAccount);
  const isRefreshingTransactions = transactionsQuery.isFetching && !transactionsQuery.isLoading;
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

  return (
    <div className="container-fluid py-7.5">
      <Toolbar className="gap-3 pt-5 pb-3 mb-4">
        <ToolbarWrapper>
          <ToolbarHeading className="gap-1.5">
            <ToolbarPageTitle>Checking Register</ToolbarPageTitle>
            <p className="text-sm text-muted-foreground">
              QuickBooks bank accounts and register transactions
            </p>
          </ToolbarHeading>
          <ToolbarActions className="w-full justify-start sm:w-auto sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={statusQuery.isFetching || accountsQuery.isFetching}
              onClick={() => {
                void statusQuery.refetch();
                void accountsQuery.refetch();
              }}
            >
              {statusQuery.isFetching || accountsQuery.isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              Refresh
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {!isConnected && !statusQuery.isLoading ? (
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
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[21rem_minmax(0,1fr)]">
          <BankAccountsPanel
            accounts={filteredAccounts}
            selectedAccountId={selectedAccountId}
            search={bankSearch}
            isLoading={statusQuery.isLoading || accountsQuery.isLoading}
            isError={accountsQuery.isError}
            isHiddenOnMobile={Boolean(selectedAccount)}
            onSearchChange={setBankSearch}
            onSelect={handleAccountSelect}
            onRetry={() => void accountsQuery.refetch()}
          />

          <TransactionsPanel
            account={selectedAccount}
            transactions={transactions}
            transactionTypes={transactionsResponse?.meta.transactionTypes ?? []}
            pagination={pagination}
            startDate={startDate}
            endDate={endDate}
            search={transactionSearch}
            clr={clr}
            transactionType={transactionType}
            isLoading={isInitialTransactionsLoading}
            isRefreshing={isRefreshingTransactions}
            isError={transactionsQuery.isError}
            hasActiveFilters={hasActiveFilters}
            onBack={() => updateParams({ accountId: null, page: 1 })}
            onSearchChange={setTransactionSearch}
            onStartDateChange={(value) => updateParams({ startDate: value, page: 1 })}
            onEndDateChange={(value) => updateParams({ endDate: value, page: 1 })}
            onClrChange={(value) => updateParams({ clr: value, page: 1 })}
            onTransactionTypeChange={(value) => updateParams({ transactionType: value, page: 1 })}
            onClearFilters={clearFilters}
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
            onSizeChange={(nextSize) => updateParams({ size: nextSize, page: 1 })}
            onRetry={() => void transactionsQuery.refetch()}
            onRefresh={() => void transactionsQuery.refetch()}
          />
        </div>
      )}
    </div>
  );
}

interface BankAccountsPanelProps {
  accounts: QuickBooksRegisterAccount[];
  selectedAccountId: string;
  search: string;
  isLoading: boolean;
  isError: boolean;
  isHiddenOnMobile: boolean;
  onSearchChange: (value: string) => void;
  onSelect: (account: QuickBooksRegisterAccount) => void;
  onRetry: () => void;
}

function BankAccountsPanel({
  accounts,
  selectedAccountId,
  search,
  isLoading,
  isError,
  isHiddenOnMobile,
  onSearchChange,
  onSelect,
  onRetry,
}: BankAccountsPanelProps) {
  return (
    <Card className={cn('min-h-[32rem] overflow-hidden', isHiddenOnMobile && 'hidden lg:flex')}>
      <CardHeader>
        <CardHeading>
          <CardTitle>Bank Accounts</CardTitle>
        </CardHeading>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-col gap-3 p-3 sm:p-4">
        <InputWrapper variant="sm" className="gap-2 px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={search}
            placeholder="Search banks..."
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </InputWrapper>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <BankAccountSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState
            title="Failed to load bank accounts"
            onRetry={onRetry}
            className="min-h-72"
          />
        ) : accounts.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 text-center">
            <Landmark className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No bank accounts found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a different search or sync QuickBooks reference data.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {accounts.map((account) => (
              <BankAccountButton
                key={account.id}
                account={account}
                selected={account.id === selectedAccountId}
                onClick={() => onSelect(account)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BankAccountSkeleton() {
  return (
    <div className="rounded-lg border border-border p-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function BankAccountButton({
  account,
  selected,
  onClick,
}: {
  account: QuickBooksRegisterAccount;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full min-w-0 cursor-pointer rounded-lg border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/30 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        selected && 'border-primary/60 bg-primary-soft/50 shadow-xs'
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
          <Landmark className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {account.accountSubType || account.fullyQualifiedName || account.qbId}
          </p>
          <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              {account.lastSyncedAt
                ? `Synced ${formatShortDate(account.lastSyncedAt)}`
                : 'Not synced'}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatMoney(account.currentBalance, account.currencyCode)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

interface TransactionsPanelProps {
  account: QuickBooksRegisterAccount | null;
  transactions: QuickBooksRegisterTransaction[];
  transactionTypes: string[];
  pagination:
    | {
        currentPage: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        totalItems: number;
        itemsPerPage: number;
      }
    | undefined;
  startDate: string;
  endDate: string;
  search: string;
  clr: QuickBooksRegisterClr | undefined;
  transactionType: string | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  hasActiveFilters: boolean;
  onBack: () => void;
  onSearchChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClrChange: (value: string | null) => void;
  onTransactionTypeChange: (value: string | null) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  onRetry: () => void;
  onRefresh: () => void;
}

function TransactionsPanel({
  account,
  transactions,
  transactionTypes,
  pagination,
  startDate,
  endDate,
  search,
  clr,
  transactionType,
  isLoading,
  isRefreshing,
  isError,
  hasActiveFilters,
  onBack,
  onSearchChange,
  onStartDateChange,
  onEndDateChange,
  onClrChange,
  onTransactionTypeChange,
  onClearFilters,
  onPageChange,
  onSizeChange,
  onRetry,
  onRefresh,
}: TransactionsPanelProps) {
  if (!account) {
    return (
      <Card className="hidden min-h-[32rem] lg:flex">
        <CardContent className="flex flex-1 flex-col items-center justify-center text-center">
          <Landmark className="mb-4 size-10 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Select a bank account</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Choose an account on the left to load QuickBooks register transactions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-[32rem] overflow-hidden">
      <CardHeader className="items-start gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button variant="outline" size="icon" className="shrink-0 lg:hidden" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <CardTitle>{account.name}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-card-header-foreground/80">
              <span>{account.accountSubType || 'Bank account'}</span>
              <span className="font-semibold tabular-nums">
                Balance {formatMoney(account.currentBalance, account.currencyCode)}
              </span>
            </div>
          </div>
        </div>
        <CardToolbar>
          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing || isLoading}
            onClick={onRefresh}
          >
            {isRefreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            Refresh
          </Button>
        </CardToolbar>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-3 sm:p-4">
        <RegisterFilters
          startDate={startDate}
          endDate={endDate}
          search={search}
          clr={clr}
          transactionType={transactionType}
          transactionTypes={transactionTypes}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={onSearchChange}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          onClrChange={onClrChange}
          onTransactionTypeChange={onTransactionTypeChange}
          onClearFilters={onClearFilters}
        />

        {isLoading ? (
          <TransactionSkeleton />
        ) : isError ? (
          <QueryErrorState
            title="Failed to load transactions"
            onRetry={onRetry}
            className="min-h-80"
          />
        ) : transactions.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 text-center">
            <SlidersHorizontal className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No transactions found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust the date range, search, or filters.
            </p>
          </div>
        ) : (
          <div className="relative min-w-0">
            {isRefreshing && (
              <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  <Loader2 className="size-3.5 animate-spin" />
                  Refreshing
                </span>
              </div>
            )}
            <TransactionsTable transactions={transactions} currencyCode={account.currencyCode} />
            <TransactionsMobileList
              transactions={transactions}
              currencyCode={account.currencyCode}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <PaginationSummary pagination={pagination} />
        <PaginationControls
          pagination={pagination}
          onPageChange={onPageChange}
          onSizeChange={onSizeChange}
        />
      </CardFooter>
    </Card>
  );
}

function RegisterFilters({
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
}: {
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
}) {
  return (
    <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(12rem,1fr)_9.5rem_9.5rem_10rem_12rem_auto] md:items-center">
      <InputWrapper variant="sm" className="gap-2 px-3">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={search}
          placeholder="Search payee, category, memo..."
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </InputWrapper>
      <Input
        type="date"
        value={startDate}
        onChange={(event) => onStartDateChange(event.target.value)}
      />
      <Input
        type="date"
        value={endDate}
        onChange={(event) => onEndDateChange(event.target.value)}
      />
      <Select
        value={clr ?? ALL_VALUE}
        onValueChange={(value) => onClrChange(value === ALL_VALUE ? null : value)}
      >
        <SelectTrigger>
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
      <Select
        value={transactionType ?? ALL_VALUE}
        onValueChange={(value) => onTransactionTypeChange(value === ALL_VALUE ? null : value)}
      >
        <SelectTrigger>
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
      <Button
        variant="ghost"
        size="sm"
        disabled={!hasActiveFilters}
        onClick={onClearFilters}
        className="justify-self-start md:justify-self-end"
      >
        Clear
      </Button>
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mt-3 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function TransactionsTable({
  transactions,
  currencyCode,
}: {
  transactions: QuickBooksRegisterTransaction[];
  currencyCode: string | null;
}) {
  return (
    <div className="hidden min-w-0 overflow-hidden rounded-lg border border-border lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-32">Date</TableHead>
            <TableHead className="w-40">Type / No.</TableHead>
            <TableHead>Payee</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="w-28">CLR</TableHead>
            <TableHead className="w-36 text-right">Amount</TableHead>
            <TableHead className="w-36 text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatShortDate(transaction.txnDate)}
              </TableCell>
              <TableCell>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {transaction.transactionType || '-'}
                  </p>
                  {transaction.checkNumber && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      No. {transaction.checkNumber}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-64">
                <span className="line-clamp-2 text-sm font-medium text-foreground">
                  {transaction.payee || '-'}
                </span>
              </TableCell>
              <TableCell className="max-w-72">
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {transaction.category || '-'}
                </span>
              </TableCell>
              <TableCell>
                <ClrBadge value={transaction.clr} />
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-semibold tabular-nums',
                  getAmountClassName(transaction.amount)
                )}
              >
                {formatMoney(transaction.amount, currencyCode)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-foreground">
                {formatMoney(transaction.balance, currencyCode)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TransactionsMobileList({
  transactions,
  currencyCode,
}: {
  transactions: QuickBooksRegisterTransaction[];
  currencyCode: string | null;
}) {
  return (
    <div className="space-y-2 lg:hidden">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {transaction.payee || transaction.transactionType || '-'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatShortDate(transaction.txnDate)} ï¿½ {transaction.transactionType || '-'}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 text-sm font-semibold tabular-nums',
                getAmountClassName(transaction.amount)
              )}
            >
              {formatMoney(transaction.amount, currencyCode)}
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
            <MobileField label="Category" value={transaction.category || '-'} />
            <MobileField label="No." value={transaction.checkNumber || '-'} />
            <div className="flex items-center justify-between gap-3">
              <span>CLR</span>
              <ClrBadge value={transaction.clr} />
            </div>
            <MobileField label="Balance" value={formatMoney(transaction.balance, currencyCode)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MobileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-foreground [overflow-wrap:anywhere]">
        {value}
      </span>
    </div>
  );
}

function ClrBadge({ value }: { value: QuickBooksRegisterClr | null }) {
  if (!value) return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <Badge variant={getClrBadgeVariant(value)} appearance="light" size="sm">
      {getClrLabel(value)}
    </Badge>
  );
}

function PaginationSummary({ pagination }: { pagination: TransactionsPanelProps['pagination'] }) {
  if (!pagination || pagination.totalItems === 0) {
    return <span className="text-xs text-muted-foreground">0 transactions</span>;
  }

  const first = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const last = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);

  return (
    <span className="text-xs text-muted-foreground">
      {first} - {last} of {pagination.totalItems} transactions
    </span>
  );
}

function PaginationControls({
  pagination,
  onPageChange,
  onSizeChange,
}: {
  pagination: TransactionsPanelProps['pagination'];
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}) {
  const page = pagination?.currentPage ?? 1;
  const size = pagination?.itemsPerPage ?? 25;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={String(size)} onValueChange={(value) => onSizeChange(Number(value))}>
        <SelectTrigger className="w-full sm:w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option} rows
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination?.hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="min-w-16 text-center text-xs font-medium text-muted-foreground">
          {page} / {pagination?.totalPages ?? 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination?.hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
