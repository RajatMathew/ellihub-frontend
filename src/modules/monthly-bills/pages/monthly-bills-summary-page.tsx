import { useMemo, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { TableCardHeader, TableCardHeaderClearButton } from '@/app/components/table-card-header';
import { Card, CardContent } from '@/app/components/ui/card';
import type { InfiniteMultiSearchSelectOption } from '@/app/components/ui/infinite-multi-search-select';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { formatCurrency } from '@/app/lib/helpers';
import { useLookupsQuery } from '@/modules/lookup/hooks';
import { MonthlyBillsFilters } from '@/modules/monthly-bills/components/monthly-bills-filters';
import { useMonthlyBillsSummaryQuery } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { useMonthlyBillsVendorFilterOptions } from '@/modules/monthly-bills/hooks/use-monthly-bills-vendor-filter-options';
import {
  formatMonthlyBillMonthName,
  getMonthlyBillMonthNumber,
  getMonthlyBillYear,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import type { MonthlyBillsPaidSummary } from '@/modules/monthly-bills/schemas/monthly-bills.schema';

interface MonthlyBillsSummaryPageProps {
  selectedDate: Date;
  enabled: boolean;
}

export function MonthlyBillsSummaryPage({ selectedDate, enabled }: MonthlyBillsSummaryPageProps) {
  const month = getMonthlyBillMonthNumber(selectedDate);
  const year = getMonthlyBillYear(selectedDate);
  const periodLabel = `${formatMonthlyBillMonthName(selectedDate)} ${year}`;
  const [selectedVendors, setSelectedVendors] = useState<InfiniteMultiSearchSelectOption[]>([]);
  const [vendorSearchInput, setVendorSearchInput] = useState('');
  const vendorSearch = useDebouncedValue(vendorSearchInput.trim(), 250);
  const [tradeCategoryIds, setTradeCategoryIds] = useState<string[]>([]);
  const [tradeCategorySearch, setTradeCategorySearch] = useState('');

  const vendorPicker = useMonthlyBillsVendorFilterOptions({
    search: vendorSearch,
    selectedOptions: selectedVendors,
  });
  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');
  const tradeCategoryOptions = useMemo<InfiniteMultiSearchSelectOption[]>(() => {
    const query = tradeCategorySearch.trim().toLowerCase();
    return (tradeCategories ?? [])
      .map((category) => ({
        value: category.id,
        label: category.label ?? category.name ?? category.id,
      }))
      .filter((option) => !query || option.label.toLowerCase().includes(query));
  }, [tradeCategories, tradeCategorySearch]);

  const vendorIds = useMemo(() => selectedVendors.map((vendor) => vendor.value), [selectedVendors]);
  const summaryParams = useMemo(
    () => ({
      month,
      year,
      vendorId: vendorIds,
      tradeCategoryId: tradeCategoryIds,
    }),
    [month, tradeCategoryIds, vendorIds, year]
  );
  const summaryQuery = useMonthlyBillsSummaryQuery(summaryParams, enabled);
  const hasActiveFilters = Boolean(selectedVendors.length || tradeCategoryIds.length);

  const handleVendorChange = (ids: string[]) => {
    setSelectedVendors((current) =>
      ids.map(
        (id) =>
          current.find((vendor) => vendor.value === id) ??
          vendorPicker.options.find((option) => option.value === id) ?? {
            value: id,
            label: id,
          }
      )
    );
  };

  const clearFilters = () => {
    setSelectedVendors([]);
    setVendorSearchInput('');
    setTradeCategoryIds([]);
    setTradeCategorySearch('');
  };

  return (
    <section aria-labelledby="monthly-bills-summary-title" className="w-full">
      <Card className="overflow-hidden">
        <TableCardHeader
          title={
            <span id="monthly-bills-summary-title" className="flex items-center">
              Summary for {periodLabel}
            </span>
          }
          actions={
            <div className="ml-auto flex w-full min-w-0 flex-col items-stretch gap-2.5 xl:w-auto xl:flex-row xl:flex-nowrap xl:items-center xl:justify-end">
              <MonthlyBillsFilters
                showSearch={false}
                vendorIds={vendorIds}
                vendorSearch={vendorSearchInput}
                vendorPicker={vendorPicker}
                tradeCategoryIds={tradeCategoryIds}
                tradeCategorySearch={tradeCategorySearch}
                tradeCategoryOptions={tradeCategoryOptions}
                onVendorChange={handleVendorChange}
                onVendorSearchChange={setVendorSearchInput}
                onTradeCategoryChange={setTradeCategoryIds}
                onTradeCategorySearchChange={setTradeCategorySearch}
              />
              {hasActiveFilters ? (
                <TableCardHeaderClearButton active onClick={clearFilters} />
              ) : null}
            </div>
          }
        />

        {summaryQuery.isPending ? (
          <MonthlyBillsSummarySkeleton />
        ) : summaryQuery.isError ? (
          <CardContent className="p-4 sm:p-5">
            <QueryErrorState
              title="Failed to load monthly summary"
              description={`We couldn't load paid PO totals for ${periodLabel}.`}
              onRetry={() => void summaryQuery.refetch()}
              className="min-h-56"
            />
          </CardContent>
        ) : (
          <MonthlyBillsSummaryTable
            summary={summaryQuery.data}
            periodLabel={periodLabel}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </Card>
    </section>
  );
}

interface MonthlyBillsSummaryTableProps {
  summary: MonthlyBillsPaidSummary;
  periodLabel: string;
  hasActiveFilters: boolean;
}

function MonthlyBillsSummaryTable({
  summary,
  periodLabel,
  hasActiveFilters,
}: MonthlyBillsSummaryTableProps) {
  return (
    <CardContent className="p-0">
      <Table aria-label={`Paid PO summary for ${periodLabel}`}>
        <TableHeader>
          <TableRow>
            <TableHead>Payment type</TableHead>
            <TableHead className="w-48 text-right">Amount paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SummaryTableRow
            label="Material POs"
            description="Purchase orders assigned to the Material trade"
            value={summary.materialPosPaid}
          />
          <SummaryTableRow
            label="Subcontractor POs"
            description="Purchase orders assigned to all other trades"
            value={summary.subcontractorPosPaid}
          />
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">Total paid</TableCell>
            <TableCell className="text-right text-base font-semibold tabular-nums">
              {formatCurrency(summary.totalPaid)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {summary.totalPaid === 0 ? (
        <p className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
          {hasActiveFilters
            ? `No PO payments match the selected filters for ${periodLabel}.`
            : `No PO payments were recorded for ${periodLabel}.`}
        </p>
      ) : null}
    </CardContent>
  );
}

interface SummaryTableRowProps {
  label: string;
  description: string;
  value: number;
}

function SummaryTableRow({ label, description, value }: SummaryTableRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-foreground">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(value)}</TableCell>
    </TableRow>
  );
}

function MonthlyBillsSummarySkeleton() {
  return (
    <CardContent className="p-0" aria-label="Loading monthly summary" aria-busy="true">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead className="w-48">
              <Skeleton className="ml-auto h-4 w-20" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SummaryTableRowSkeleton />
          <SummaryTableRowSkeleton />
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="ml-auto h-6 w-28" />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </CardContent>
  );
}

function SummaryTableRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="ml-auto h-5 w-24" />
      </TableCell>
    </TableRow>
  );
}
