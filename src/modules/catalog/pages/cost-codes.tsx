import { useState } from 'react';

import { useQueries } from '@tanstack/react-query';
import { Edit, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Input } from '@app/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@app/components/ui/tabs';
import { cn } from '@app/lib/utils';

import { costCodesApi } from '../api/costcodes.api';
import { CostCodeFormDialog } from '../components/costcode-form-dialog';
import {
  PageHeader,
  SectionHeader,
  StatsRow,
  type SectionTableColumn,
} from '../components/reference';
import { costCodesKeys } from '../constants/costcodes.keys';
import {
  useCostCodeCategoriesQuery,
  useCostCodesQuery,
  useCreateCostCodeMutation,
  useDeleteCostCodeMutation,
  useUpdateCostCodeMutation,
} from '../hooks';
import type { CostCode, CostCodeCreate } from '../schemas/costcode.schema';

const DEFAULT_PAGE_SIZE = 10;

export function CostCodesListPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCostCode, setEditingCostCode] = useState<CostCode | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filters = {
    page,
    size: DEFAULT_PAGE_SIZE,
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
    search: searchDebounced || undefined,
    costCodeCategoryId: categoryFilter ?? undefined,
  };

  const { data, isLoading } = useCostCodesQuery(filters);
  const { data: categories = [] } = useCostCodeCategoriesQuery();
  const del = useDeleteCostCodeMutation();
  const createMutation = useCreateCostCodeMutation();
  const updateMutation = useUpdateCostCodeMutation();

  const categoryCountQueries = useQueries({
    queries: categories.slice(0, 3).map((cat) => ({
      queryKey: [...costCodesKeys.list(), { costCodeCategoryId: cat.id, size: 1 }],
      queryFn: () => costCodesApi.list({ costCodeCategoryId: cat.id, page: 1, size: 1 }),
    })),
  });

  const listData = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE));
  const startIndex = (page - 1) * DEFAULT_PAGE_SIZE;
  const endIndex = Math.min(startIndex + listData.length, totalCount);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSearchDebounced(value);
    setPage(1);
  };

  const statsItems = [
    {
      label: 'Total Cost Codes',
      value: totalCount,
      description: 'Master list',
      variant: 'default' as const,
    },
    ...categories.slice(0, 3).map((cat, i) => {
      const countData = categoryCountQueries[i]?.data;
      const count = countData?.count ?? 0;
      return {
        label: cat.name.toUpperCase(),
        value: count,
        description: cat.description ?? 'Category',
        variant: 'primary' as const,
      };
    }),
  ].slice(0, 4);

  const costCodeColumns: SectionTableColumn<CostCode>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (row) => <span className="text-[13px] font-medium text-gray-700">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="text-[13px] font-bold text-gray-900">{row.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => <span className="text-[13px] text-gray-600">{row.description ?? '—'}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="text-[13px] text-gray-600">{row.costCodeCategory?.name ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-0',
      headerClassName: 'w-0',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-gray-500 hover:text-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to={`${row.id}`}>View</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditingCostCode(row)}>
              Edit
            </DropdownMenuItem>
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => del.mutate(row.id)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="container-fluid pb-6">
      <PageHeader
        breadcrumbs={[{ label: 'Catalog', href: '/catalog' }, { label: 'Cost Codes' }]}
        title="Cost Codes"
        actions={[
          {
            label: 'Add Cost Code',
            icon: Plus,
            onClick: () => setCreateModalOpen(true),
            variant: 'primary',
            className: 'bg-gray-900 text-white hover:bg-gray-800',
          },
          {
            label: 'Categories',
            icon: Edit,
            href: 'categories',
            variant: 'outline',
          },
        ]}
      />

      <CostCodeFormDialog
        key={editingCostCode?.id ?? 'create'}
        open={createModalOpen || editingCostCode != null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalOpen(false);
            setEditingCostCode(null);
          }
        }}
        costCode={editingCostCode}
        onSubmit={(data) => {
          if ('id' in data && data.id) {
            updateMutation.mutate(data as CostCode, {
              onSuccess: () => {
                setCreateModalOpen(false);
                setEditingCostCode(null);
              },
            });
          } else {
            createMutation.mutate(data as CostCodeCreate, {
              onSuccess: () => {
                setCreateModalOpen(false);
                setEditingCostCode(null);
              },
            });
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <StatsRow items={statsItems} className="mb-6" />

      <Tabs
        value={categoryFilter ?? 'all'}
        onValueChange={(v) => {
          setCategoryFilter(v === 'all' ? null : v);
          setPage(1);
        }}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <TabsList variant="default" size="lg" className="flex-wrap">
            <TabsTrigger value="all">ALL</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="overflow-hidden rounded-sm border border-gray-200 bg-background shadow-sm">
          <SectionHeader
            title={`COST CODES MASTER LIST (${totalCount})`}
            actions={[
              {
                label: 'Add Cost Code',
                icon: Plus,
                variant: 'primary',
                onClick: () => setCreateModalOpen(true),
              },
            ]}
          >
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-7 w-45 rounded-sm border-gray-600 bg-gray-800 pl-8 text-[12px] text-white placeholder:text-gray-400"
              />
            </div>
          </SectionHeader>

          {isLoading ? (
            <div className="px-5 py-8 text-center text-[13px] text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {costCodeColumns.map((col) => (
                        <th
                          key={col.key}
                          className={cn(
                            'px-5 py-3 text-[11px] font-semibold tracking-wide text-gray-500 uppercase',
                            col.align === 'right' && 'text-right',
                            col.headerClassName
                          )}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={costCodeColumns.length}
                          className="px-5 py-8 text-center text-[13px] text-gray-500"
                        >
                          No cost codes found.
                        </td>
                      </tr>
                    ) : (
                      listData.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                        >
                          {costCodeColumns.map((col) => (
                            <td
                              key={col.key}
                              className={cn(
                                'px-5 py-4',
                                col.align === 'right' && 'text-right',
                                col.className
                              )}
                            >
                              {col.render(row)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalCount > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
                  <div className="flex items-center gap-2 text-[13px] text-gray-600">
                    <span>Show</span>
                    <span className="font-medium">{DEFAULT_PAGE_SIZE}</span>
                    <span>per page</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-gray-600">
                    <span>
                      {totalCount === 0
                        ? '0 of 0'
                        : `${startIndex + 1}-${endIndex} of ${totalCount}`}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-sm text-gray-400"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        &lt;
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        &gt;
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
