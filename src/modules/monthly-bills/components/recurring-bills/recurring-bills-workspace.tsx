import { useMemo, useState } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import { TableCardHeader, TableCardHeaderSearch } from '@/app/components/table-card-header';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Switch } from '@/app/components/ui/switch';
import { formatCurrency } from '@/app/lib/helpers';
import type {
  RecurringBillFrequency,
  RecurringBillRule,
} from '@/modules/monthly-bills/types/recurring-bills.types';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { Plus, Receipt, X } from 'lucide-react';

type RuleFilter = 'all' | 'active' | 'paused';

interface RecurringBillsWorkspaceProps {
  rules: RecurringBillRule[];
  search: string;
  onSearchChange: (search: string) => void;
  onCreateRule: () => void;
  onToggleActive: (ruleId: string, isActive: boolean) => void;
}

const filterLabels: Array<{ value: RuleFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

export function RecurringBillsWorkspace({
  rules,
  search,
  onSearchChange,
  onCreateRule,
  onToggleActive,
}: RecurringBillsWorkspaceProps) {
  const [filter, setFilter] = useState<RuleFilter>('all');
  const searchedRules = rules.filter((rule) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [rule.name, rule.vendorName, rule.categoryName, rule.bankAccountName]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });
  const visibleRules = searchedRules.filter((rule) => {
    if (filter === 'active') return rule.isActive;
    if (filter === 'paused') return !rule.isActive;
    return true;
  });
  const counts: Record<RuleFilter, number> = {
    all: searchedRules.length,
    active: searchedRules.filter((rule) => rule.isActive).length,
    paused: searchedRules.filter((rule) => !rule.isActive).length,
  };
  const columns = useMemo<ColumnDef<RecurringBillRule>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Bill" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold leading-5 text-foreground">
              {row.original.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{row.original.vendorName}</p>
          </div>
        ),
        meta: { headerClassName: 'min-w-64', textOverflow: 'wrap' },
      },
      {
        accessorKey: 'categoryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        cell: ({ row }) => row.original.categoryName ?? 'Not assigned',
        meta: { headerClassName: 'min-w-52', cellClassName: 'text-muted-foreground' },
        enableSorting: false,
      },
      {
        accessorKey: 'bankAccountName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Pay from" />,
        cell: ({ row }) => row.original.bankAccountName ?? 'Not selected',
        meta: { headerClassName: 'min-w-36', cellClassName: 'text-muted-foreground' },
        enableSorting: false,
      },
      {
        accessorKey: 'frequency',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Repeats" />,
        cell: ({ row }) => getFrequencyLabel(row.original.frequency),
        meta: { headerClassName: 'min-w-32' },
        enableSorting: false,
      },
      {
        accessorKey: 'dueDay',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due" />,
        cell: ({ row }) => getDueLabel(row.original),
        meta: { headerClassName: 'min-w-28' },
        enableSorting: false,
      },
      {
        accessorKey: 'defaultAmount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {row.original.defaultAmount > 0
                ? formatCurrency(row.original.defaultAmount)
                : 'Variable'}
            </p>
            {row.original.lastPaidLabel && (
              <p className="mt-1 text-xs text-muted-foreground">
                Paid {row.original.lastPaidLabel}
              </p>
            )}
          </div>
        ),
        meta: { headerClassName: 'min-w-32' },
        enableSorting: false,
      },
      {
        id: 'active',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Active" />,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Switch
              size="sm"
              checked={row.original.isActive}
              onCheckedChange={(isActive) => onToggleActive(row.original.id, isActive)}
              aria-label={`Toggle ${row.original.name}`}
            />
          </div>
        ),
        meta: { headerClassName: 'w-24 text-center', cellClassName: 'text-center' },
        enableSorting: false,
      },
    ],
    [onToggleActive]
  );
  const table = useReactTable({
    data: visibleRules,
    columns,
    pageCount: 1,
    state: {
      pagination: { pageIndex: 0, pageSize: Math.max(visibleRules.length, 1) },
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });
  const hasActiveFilters = Boolean(search || filter !== 'all');

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
            <div className="flex flex-wrap gap-1.5 xl:flex-nowrap">
              {filterLabels.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={
                    filter === item.value
                      ? 'border-table-card-header-foreground/25 bg-table-card-header-foreground text-card-header hover:bg-table-card-header-foreground hover:text-card-header'
                      : 'border-table-card-header-foreground/25 bg-card-header text-table-card-header-foreground hover:border-table-card-header-foreground/40 hover:bg-card-header hover:text-table-card-header-foreground'
                  }
                  onClick={() => setFilter(item.value)}
                >
                  {item.label} {counts[item.value]}
                </Button>
              ))}
            </div>
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

      <DataGridSection
        table={table}
        totalCount={visibleRules.length}
        isLoading={false}
        refreshIndicator="none"
        isError={false}
        errorTitle="Failed to load recurring bills"
        emptyIcon={<Receipt className="size-10 text-muted-foreground/50" />}
        emptyTitle="No recurring bills found"
        emptyDescription="Clear the search or choose another filter."
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange('');
                setFilter('all');
              }}
            >
              <X className="size-3.5" />
              Clear filters
            </Button>
          ) : null
        }
        onRetry={() => undefined}
        tableLayout={{
          width: 'auto',
        }}
        tableClassNames={{
          base: 'min-w-full',
        }}
      />
    </Card>
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
