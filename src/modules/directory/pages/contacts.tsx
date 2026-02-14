import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Mail, MoreHorizontal, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@app/components/ui/avatar';
import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@app/components/ui/card';
import { StatsCard } from '@app/components/ui/stats-card';
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
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Skeleton } from '@app/components/ui/skeleton';
import { getInitials } from '@app/lib/helpers';

import { useContactsQuery, useDeleteContactMutation, useDirectoryKpisQuery } from '../hooks';
import type { Contact, ListContactsParams } from '../schemas/contact.schema';

/* ---- Constants ---- */

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['name', 'jobTitle', 'createdAt'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

/* ---- Static seed data (until API is ready) ---- */

const SEED_CONTACTS: Contact[] = [
  {
    id: 'ct-001',
    name: 'John Smith',
    emails: [{ email: 'john@acmevendor.com', label: 'Work' }],
    phoneNumbers: [
      { phone: '212-555-1001', label: 'Office' },
      { phone: '917-555-2002', label: 'Mobile' },
    ],
    jobTitle: 'Project Manager',
    vendorId: 'ven-001',
    generalContractorId: null,
    tags: ['Urgent Only'],
    deletedAt: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-20T14:30:00.000Z',
  },
  {
    id: 'ct-002',
    name: 'Maria Garcia',
    emails: [{ email: 'maria@buildcorp.com', label: 'Work' }],
    phoneNumbers: [],
    jobTitle: 'Estimator',
    vendorId: null,
    generalContractorId: 'gc-001',
    tags: ['Finance', 'Priority'],
    deletedAt: null,
    createdAt: '2026-01-16T09:00:00.000Z',
    updatedAt: '2026-01-16T09:00:00.000Z',
  },
  {
    id: 'ct-003',
    name: 'Robert Chen',
    emails: [{ email: 'robert.chen@fieldwork.com', label: 'Work' }],
    phoneNumbers: [
      { phone: '718-555-3003', label: 'Office' },
      { phone: '646-555-3004', label: 'Mobile' },
    ],
    jobTitle: 'Superintendent',
    vendorId: null,
    generalContractorId: null,
    tags: [],
    deletedAt: null,
    createdAt: '2026-01-17T08:00:00.000Z',
    updatedAt: '2026-01-18T11:00:00.000Z',
  },
  {
    id: 'ct-004',
    name: 'Sarah Johnson',
    emails: [
      { email: 'sarah.j@finance.com', label: 'Work' },
      { email: 'sarah.johnson@gmail.com', label: 'Personal' },
    ],
    phoneNumbers: [{ phone: '212-555-4004', label: 'Office' }],
    jobTitle: 'Accounting',
    vendorId: 'ven-002',
    generalContractorId: 'gc-002',
    tags: ['Finance'],
    deletedAt: null,
    createdAt: '2026-01-18T10:00:00.000Z',
    updatedAt: '2026-01-18T10:00:00.000Z',
  },
  {
    id: 'ct-005',
    name: 'Mike Davis',
    emails: [],
    phoneNumbers: [{ phone: '347-555-5005', label: 'Mobile' }],
    jobTitle: 'Engineer',
    vendorId: null,
    generalContractorId: null,
    tags: ['Field'],
    deletedAt: null,
    createdAt: '2026-01-19T09:00:00.000Z',
    updatedAt: '2026-01-19T09:00:00.000Z',
  },
  {
    id: 'ct-006',
    name: 'Angela Rivera',
    emails: [{ email: 'angela.r@steelworks.com', label: 'Work' }],
    phoneNumbers: [{ phone: '917-555-6006', label: 'Mobile' }],
    jobTitle: 'Safety Officer',
    vendorId: 'ven-003',
    generalContractorId: null,
    tags: ['Safety', 'Compliance'],
    deletedAt: null,
    createdAt: '2026-01-20T07:30:00.000Z',
    updatedAt: '2026-01-21T09:00:00.000Z',
  },
  {
    id: 'ct-007',
    name: 'David Kim',
    emails: [{ email: 'david.kim@structuralco.com', label: 'Work' }],
    phoneNumbers: [
      { phone: '646-555-7007', label: 'Office' },
      { phone: '917-555-7008', label: 'Mobile' },
    ],
    jobTitle: 'Structural Engineer',
    vendorId: null,
    generalContractorId: 'gc-003',
    tags: ['Engineering'],
    deletedAt: null,
    createdAt: '2026-01-22T08:00:00.000Z',
    updatedAt: '2026-01-22T08:00:00.000Z',
  },
  {
    id: 'ct-008',
    name: 'Lisa Thompson',
    emails: [{ email: 'lisa.t@designhub.com', label: 'Work' }],
    phoneNumbers: [{ phone: '212-555-8008', label: 'Office' }],
    jobTitle: 'Architect',
    vendorId: 'ven-004',
    generalContractorId: null,
    tags: ['Design'],
    deletedAt: null,
    createdAt: '2026-01-23T10:00:00.000Z',
    updatedAt: '2026-01-24T15:00:00.000Z',
  },
  {
    id: 'ct-009',
    name: 'James Wilson',
    emails: [{ email: 'j.wilson@concreteplus.com', label: 'Work' }],
    phoneNumbers: [],
    jobTitle: 'Foreman',
    vendorId: 'ven-005',
    generalContractorId: null,
    tags: [],
    deletedAt: null,
    createdAt: '2026-01-24T11:00:00.000Z',
    updatedAt: '2026-01-24T11:00:00.000Z',
  },
  {
    id: 'ct-010',
    name: 'Patricia Adams',
    emails: [
      { email: 'padams@legalteam.com', label: 'Work' },
      { email: 'patricia.a@outlook.com', label: 'Personal' },
    ],
    phoneNumbers: [{ phone: '718-555-1010', label: 'Office' }],
    jobTitle: 'Contracts Manager',
    vendorId: null,
    generalContractorId: 'gc-001',
    tags: ['Legal', 'Contracts'],
    deletedAt: null,
    createdAt: '2026-01-25T09:00:00.000Z',
    updatedAt: '2026-01-26T14:00:00.000Z',
  },
];

const SEED_KPIS = { totalContacts: 10, withVendor: 5, withGC: 4 };

/* ---- Search-param helpers ---- */

function isSortByField(v: string | null): v is SortByField {
  return SORT_BY_OPTIONS.includes(v as SortByField);
}

function parsePageParam(v: string | null): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function parseSizeParam(v: string | null): number {
  const n = Number(v);
  return [5, 10, 25, 50, 100].includes(n) ? n : DEFAULT_PAGE_SIZE;
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
    : 'name';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';

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
    [setSearchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined, page: undefined });
      }, SEARCH_DEBOUNCE_MS);
    },
    [updateParams]
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
  };

  const { data, isLoading } = useContactsQuery(filters);
  const { data: kpis } = useDirectoryKpisQuery();
  const del = useDeleteContactMutation();

  // Use API data when available, fall back to seed data
  const listData = data?.data?.length ? data.data : SEED_CONTACTS;
  const totalCount = data?.pagination?.totalItems ?? SEED_KPIS.totalContacts;
  const resolvedKpis = kpis ?? SEED_KPIS;

  // Map URL sort state → TanStack SortingState
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  const statsItems = [
    {
      label: 'Total Contacts',
      value: resolvedKpis.totalContacts,
      icon: <Users className="size-6 text-primary" />,
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Primary Contacts',
      value: resolvedKpis.totalContacts,
      icon: <Users className="size-6 text-info" />,
      bgClass: 'bg-info/10',
    },
    {
      label: 'GC Linked',
      value: resolvedKpis.withGC,
      icon: <Users className="size-6 text-success" />,
      bgClass: 'bg-success/10',
    },
    {
      label: 'Vendors Linked',
      value: resolvedKpis.withVendor,
      icon: <Users className="size-6 text-warning" />,
      bgClass: 'bg-warning/10',
    },
  ];

  const columns = useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Contact Name" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(row.original.name, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <Link
                to={`${row.original.id}`}
                className="text-sm font-medium text-foreground hover:text-primary"
              >
                {row.original.name}
              </Link>
              {row.original.jobTitle && (
                <span className="text-2sm text-muted-foreground">{row.original.jobTitle}</span>
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
        accessorKey: 'vendorId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor / Company" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.vendorId ?? '—'}
          </span>
        ),
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
          const firstEmail = row.original.emails?.[0];
          if (!firstEmail) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-3.5" />
              <a href={`mailto:${firstEmail.email}`} className="hover:text-primary">
                {firstEmail.email}
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
          const firstPhone = row.original.phoneNumbers?.[0];
          if (!firstPhone) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              <a href={`tel:${firstPhone.phone}`} className="hover:text-primary">
                {firstPhone.phone}
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
        accessorKey: 'jobTitle',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Roles" />,
        cell: ({ row }) =>
          row.original.jobTitle ? (
            <Badge variant="primary" appearance="light" size="sm">
              {row.original.jobTitle}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
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
    [del]
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
        const newSortBy = isSortByField(col.id) ? col.id : 'name';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'name' ? undefined : newSortBy,
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
              All Contacts: {totalCount}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5 lg:mb-7.5">
        {statsItems.map((item) => (
          <StatsCard
            key={item.label}
            icon={item.icon}
            bgClass={item.bgClass}
            label={item.label}
            value={item.value}
          />
        ))}
      </div>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Directory</CardTitle>
          <CardToolbar>
            <InputWrapper variant="sm">
              <Search className="size-4" />
              <Input
                placeholder="Search contacts..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </InputWrapper>
          </CardToolbar>
        </CardHeader>
        <DataGrid
          table={table}
          recordCount={totalCount}
          isLoading={isLoading}
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
      </Card>
    </div>
  );
}
