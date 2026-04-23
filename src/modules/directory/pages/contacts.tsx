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
  Filter,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@app/components/ui/avatar';
import { Badge } from '@app/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Toolbar, ToolbarActions, ToolbarHeading, ToolbarPageTitle, ToolbarWrapper } from '@app/components/toolbar/toolbar';
import { Skeleton } from '@app/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@app/components/ui/tooltip';
import { getInitials, parsePageParam, parseSizeParam } from '@app/lib/helpers';

import {
  useContactsQuery,
  useDeleteContactMutation,
  useProfessionalRolesQuery,
  useVendorsQuery,
} from '../hooks';
import type { Contact, ListContactsParams } from '../schemas/contact.schema';

/* ---- Constants ---- */

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['fullName', 'createdAt', 'updatedAt'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

/* ---- Search-param helpers ---- */

function isSortByField(v: string | null): v is SortByField {
  return SORT_BY_OPTIONS.includes(v as SortByField);
}

/* ---- Page ---- */

export function ContactsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'fullName';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const roleFilter = searchParams.get('professionalRoleId') ?? undefined;

  // Local search input tracks typing; debounce syncs to URL
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep local input in sync when URL changes externally (e.g. back/forward)
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Stable setter that merges into existing params
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

  // Clean up debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Build API filter object
  const filters: ListContactsParams = {
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    professionalRoleId: roleFilter,
  };

  const hasActiveFilters = !!searchQuery || !!roleFilter;

  const { data, isLoading, isError, refetch } = useContactsQuery(filters);
  const { data: professionalRoles } = useProfessionalRolesQuery();
  const { data: vendorsData } = useVendorsQuery({ page: 1, limit: 1000 });
  const del = useDeleteContactMutation();

  // Use API data
  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;


  // Map URL sort state → TanStack SortingState
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  // Build name lookup maps for vendor/GC IDs → names
  const vendorNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vendorsData?.data ?? []) map.set(v.id, v.name);
    return map;
  }, [vendorsData]);

  const columns = useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Contact Name" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(row.original.fullName, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <Link
                to={`${row.original.id}`}
                className="text-sm font-medium text-foreground hover:text-primary"
              >
                {row.original.fullName}
              </Link>
              {row.original.professionalRole && (
                <span className="text-2sm text-muted-foreground">
                  {row.original.professionalRole.label || row.original.professionalRole.name}
                </span>
              )}
            </div>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[250px]',
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ),
        },
      },
      {
        id: 'linkedEntity',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Linked Company" />
        ),
        cell: ({ row }) => {
          const contact = row.original;
          const links: { name: string; id: string; type: string }[] = [];

          // 1. Check root-level vendor
          if (contact.vendor) {
            links.push({ id: contact.vendor.id, name: contact.vendor.name, type: 'VENDOR' });
          }
          // 2. Check root-level GC
          if (contact.generalContractor) {
            links.push({ id: contact.generalContractor.id, name: contact.generalContractor.name, type: 'GC' });
          }
          // 3. Add vendorLinks (if not duplicate of root vendor)
          (contact.vendorLinks || []).forEach((l) => {
            if (!links.find((ex) => ex.id === l.vendorId)) {
              links.push({ id: l.vendorId, name: vendorNames.get(l.vendorId) || l.vendorId, type: 'VENDOR' });
            }
          });
          // 4. Add gcLinks
          (contact.gcLinks || []).forEach((l) => {
            if (!links.find((ex) => ex.id === l.generalContractorId)) {
              links.push({ id: l.generalContractorId, name: l.generalContractorId, type: 'GC' });
            }
          });

          if (links.length === 0) return <span className="text-sm text-muted-foreground">—</span>;

          const firstName = links[0].name;

          if (links.length === 1) {
            return <span className="text-sm text-muted-foreground">{firstName}</span>;
          }

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground cursor-default underline decoration-dotted underline-offset-4 decoration-muted-foreground/50 hover:decoration-muted-foreground">
                  {firstName} <span className="text-muted-foreground/75 text-xs font-semibold">+{links.length - 1}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex flex-col gap-1 p-2">
                <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-0.5">Linked Entities</span>
                {links.map((l) => (
                  <span key={`${l.type}-${l.id}`} className="text-xs font-medium">
                    {l.name} ({l.type})
                  </span>
                ))}
              </TooltipContent>
            </Tooltip>
          );
        },
        meta: {
          headerClassName: 'min-w-[180px]',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        id: 'email',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
        cell: ({ row }) => {
          const email = row.original.email?.[0];
          if (!email) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-3.5" />
              <a href={`mailto:${email.email}`} className="hover:text-primary">
                {email.email}
              </a>
            </div>
          );
        },
        meta: {
          headerClassName: 'min-w-[220px]',
          skeleton: (
            <div className="flex items-center gap-2">
              <Skeleton className="size-3.5 rounded-sm" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'phone',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Phone" />,
        cell: ({ row }) => {
          const phone = row.original.phoneNumber?.[0];
          if (!phone) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              <a href={`tel:${phone.number}`} className="hover:text-primary">
                {phone.number}
              </a>
            </div>
          );
        },
        meta: {
          headerClassName: 'min-w-[170px]',
          skeleton: (
            <div className="flex items-center gap-2">
              <Skeleton className="size-3.5 rounded-sm" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'role',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Roles" />,
        cell: ({ row }) => {
          const role = row.original.professionalRole;
          return role ? (
            <Badge variant="primary" appearance="light" size="sm">
              {role.label || role.name || role.id}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          );
        },
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: false,
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
                <Link to={`${row.original.id}`}>View</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`${row.original.id}/edit`}>Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => del.mutate(row.original.id)}
              >
                <Trash2 className="size-4" />
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
    [del, vendorNames],
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
        // Reset to first page when page size changes
        patches.page = undefined;
      }

      updateParams(patches);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const col = next[0];

      if (!col) {
        // Sorting cleared — reset to defaults
        updateParams({ sortBy: undefined, sortOrder: undefined, page: undefined });
      } else {
        const newSortBy = isSortByField(col.id) ? col.id : 'fullName';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'fullName' ? undefined : newSortBy,
          sortOrder: newSortOrder === 'asc' ? undefined : newSortOrder,
          page: undefined,
        });
      }
    },
  });

  return (
    <div className="container-fluid py-7.5">
      {/* Toolbar */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>Contacts</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : `All Contacts: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                Add Contact
              </Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>


      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Directory</CardTitle>
          <CardToolbar>
            <div className="flex items-center gap-2.5">
              <Select
                value={roleFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    professionalRoleId: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <Filter className="size-3.5 mr-1.5" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {professionalRoles?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.label || role.name || role.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InputWrapper variant="sm">
                <Search className="size-4" />
                <Input
                  placeholder="Search contacts..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </InputWrapper>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSearchInput('');
                    updateParams({
                      search: undefined,
                      professionalRoleId: undefined,
                      page: undefined,
                    });
                  }}
                >
                  <X className="size-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </CardToolbar>
        </CardHeader>
        {isError ? (
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="size-10 text-destructive/60" />
              <p className="text-sm font-medium">Failed to load contacts</p>
              <p className="text-xs text-muted-foreground">
                Something went wrong. Please try again.
              </p>
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
              <div className="flex flex-col items-center gap-2 py-8">
                <Users className="size-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No contacts yet</p>
                <p className="text-xs text-muted-foreground">
                  Click &quot;+ Add Contact&quot; to get started.
                </p>
              </div>
            }
            tableLayout={{
              cellBorder: false,
              rowBorder: true,
              headerBackground: true,
            }}
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
    </div>
  );
}
