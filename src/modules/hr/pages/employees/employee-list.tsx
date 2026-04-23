import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertCircle,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@app/components/ui/card';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import { DataGrid } from '@app/components/ui/data-grid';
import { DataGridColumnHeader } from '@app/components/ui/data-grid-column-header';
import { DataGridPagination } from '@app/components/ui/data-grid-pagination';
import { DataGridTable } from '@app/components/ui/data-grid-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@app/components/ui/input';
import { Skeleton } from '@app/components/ui/skeleton';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { parsePageParam, parseSizeParam } from '@app/lib/helpers';

import { useDeleteEmployeeMutation, useEmployeesQuery } from '../../hooks/employees.hooks';
import type { Employee, ListEmployeesParams } from '../../schemas/employee.schema';

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export default function EmployeeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'name';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'asc';

  // Local search input
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === '') {
            next.delete(k);
          } else {
            next.set(k, v);
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined, page: undefined });
      }, SEARCH_DEBOUNCE_MS);
    },
    [updateParams],
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const filters: ListEmployeesParams = {
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
  };

  const { data, isLoading, isError, refetch, isRefetching } = useEmployeesQuery(filters);
  const deleteMutation = useDeleteEmployeeMutation();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;

  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Employee Name" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {row.original.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex flex-col gap-0.5">
              <Link
                to={row.original.id}
                className="text-sm font-semibold text-foreground uppercase tracking-tight hover:text-primary transition-colors"
              >
                {row.original.name}
              </Link>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none">
                {row.original.role?.name || 'Standard Employee'}
              </div>
            </div>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[250px]',
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ),
        },
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <Mail className="size-3.5" />
            <span className="truncate max-w-[200px]">{row.original.email}</span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[200px]',
          skeleton: <Skeleton className="h-4 w-40" />,
        },
      },
      {
        accessorKey: 'phoneNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Phone" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <Phone className="size-3.5" />
            <span>{row.original.phoneNumber || '—'}</span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: <Skeleton className="h-4 w-28" />,
        },
      },
      {
        accessorKey: 'department.name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Department" />,
        cell: ({ row }) => (
          <div className="text-sm font-medium uppercase tracking-wide">
            {row.original.department?.name || '—'}
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: <Skeleton className="h-4 w-20" />,
        },
      },
      {
        accessorKey: 'startDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.startDate ? new Date(row.original.startDate).toLocaleDateString() : '—'}
          </span>
        ),
        meta: {
          headerClassName: 'w-[150px]',
          skeleton: <Skeleton className="h-4 w-20" />,
        },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                mode="icon"
                size="sm"
                className="size-7"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link to={row.original.id}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`${row.original.id}/edit`}>Edit Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget({ id: row.original.id, name: row.original.name })}
              >
                <UserMinus className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        meta: {
          headerClassName: 'w-[60px]',
          skeleton: <Skeleton className="size-7 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [],
  );

  const pageCount = Math.max(1, Math.ceil(totalCount / size));

  const table = useReactTable({
    data: listData,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const prev = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const patches: Record<string, string | undefined> = {};
      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size = next.pageSize === DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
        patches.page = undefined;
      }
      updateParams(patches);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const col = next[0];
      if (!col) {
        updateParams({ sortBy: undefined, sortOrder: undefined, page: undefined });
      } else {
        updateParams({
          sortBy: col.id === 'name' ? undefined : col.id,
          sortOrder: col.desc ? 'desc' : undefined,
          page: undefined,
        });
      }
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>Employees</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {searchQuery
                ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : `Active Workforce: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                Add Employee
              </Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardToolbar>
            <div className="flex items-center gap-2.5">
              <InputWrapper variant="sm">
                <Search className="size-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </InputWrapper>
              {(searchQuery || isRefetching) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (searchQuery) {
                      setSearchInput('');
                      updateParams({ search: undefined, page: undefined });
                    } else {
                      refetch();
                    }
                  }}
                >
                  {isRefetching ? (
                    <RefreshCcw className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                  {isRefetching ? 'Refreshing...' : 'Clear'}
                </Button>
              )}
            </div>
          </CardToolbar>
        </CardHeader>

        {isError ? (
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="size-10 text-destructive/60" />
              <p className="text-sm font-medium">Failed to load employees</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        ) : (
          <DataGrid
            table={table}
            recordCount={totalCount}
            isLoading={isLoading}
            emptyMessage={
              <div className="flex flex-col items-center gap-2 py-12">
                <Users className="size-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground uppercase tracking-widest">No employees found</p>
                <p className="text-xs text-muted-foreground">Add your first employee to start managing your HR workforce.</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                   <Link to="create">
                    <Plus className="size-4 mr-2" />
                    New Employee
                  </Link>
                </Button>
              </div>
            }
          >
            <CardTable>
              <DataGridTable />
            </CardTable>
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </DataGrid>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Employee"
        description={
          <>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action will remove the employee from all departments and projects.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
