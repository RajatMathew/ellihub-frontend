import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import {
  Calendar,
  Check,
  Edit2,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
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
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import { DataGrid } from '@app/components/ui/data-grid';
import { DataGridColumnHeader } from '@app/components/ui/data-grid-column-header';
import { DataGridPagination } from '@app/components/ui/data-grid-pagination';
import { DataGridTable } from '@app/components/ui/data-grid-table';
import { Skeleton } from '@app/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@app/components/ui/input';
import { Label } from '@app/components/ui/label';
import { Textarea } from '@app/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@app/components/ui/tooltip';
import { formatDate, parsePageParam, parseSizeParam } from '@app/lib/helpers';

import {
  useApprovePTOMutation,
  useDeletePTOMutation,
  usePTOListQuery,
  useRejectPTOMutation,
} from '../../hooks/pto.hooks';
import type { PTO } from '../../schemas/pto.schema';

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function PTOListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<{
    id: string;
    name: string;
    type: 'approve' | 'reject';
  } | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);

  // Read state from URL
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size')) || DEFAULT_PAGE_SIZE;
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'startDate';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc';

  // Local search input
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const { data, isLoading, refetch, isRefetching } = usePTOListQuery({
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
  });

  const approveMutation = useApprovePTOMutation();
  const rejectMutation = useRejectPTOMutation();
  const deleteMutation = useDeletePTOMutation();

  const handleDecisionSubmit = async () => {
    if (!decisionTarget) return;
    if (!note.trim()) {
      setNoteError(true);
      toast.error('Internal note is required');
      return;
    }

    const mutation = decisionTarget.type === 'approve' ? approveMutation : rejectMutation;
    await mutation.mutateAsync({ id: decisionTarget.id, note });

    setDecisionTarget(null);
    setNote('');
    setNoteError(false);
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    return `${days}d`;
  };

  const columns = useMemo<ColumnDef<PTO>[]>(
    () => [
      {
        accessorKey: 'id',
        size: 90,
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => (
          <Link to={row.original.id} className="hover:underline">
            <span className="text-xs font-bold text-primary uppercase">
              PTO-{row.original.id.substring(row.original.id.length - 4)}
            </span>
          </Link>
        ),
        meta: { 
          headerClassName: 'w-[90px]',
          skeleton: <Skeleton className="h-4 w-12 rounded" />,
        },
      },
      {
        accessorKey: 'employee.name',
        size: 150,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Employee" />,
        cell: ({ row }) => (
          <span className="text-xs font-bold uppercase tracking-tight">
            {row.original.employee?.name || 'Unknown'}
          </span>
        ),
        meta: { 
          headerClassName: 'w-[150px]',
          skeleton: <Skeleton className="h-4 w-32 rounded" />,
        },
      },
      {
        accessorKey: 'type.label',
        size: 110,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold bg-primary/5 text-primary border-primary/20 whitespace-nowrap"
          >
            {row.original.type?.label || 'Vacation'}
          </Badge>
        ),
        meta: { 
          headerClassName: 'w-[110px]',
          skeleton: <Skeleton className="h-5 w-20 rounded" />,
        },
      },
      {
        id: 'dates',
        size: 130,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Dates" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium uppercase whitespace-nowrap">
              {formatDate(row.original.startDate, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/50 font-bold uppercase">TO</span>
              <span className="text-xs text-muted-foreground/80 font-medium uppercase whitespace-nowrap">
                {formatDate(row.original.endDate, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        ),
        meta: { 
          headerClassName: 'w-[130px]',
          skeleton: (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          ),
        },
      },
      {
        id: 'days',
        size: 50,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Days" />,
        cell: ({ row }) => (
          <span className="text-xs font-bold whitespace-nowrap">
            {calculateDays(row.original.startDate, row.original.endDate)}
          </span>
        ),
        meta: { 
          headerClassName: 'w-[50px]',
          skeleton: <Skeleton className="h-4 w-8 rounded" />,
        },
      },
      {
        accessorKey: 'status',
        size: 90,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const colors: Record<string, string> = {
            PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
            APPROVED: 'bg-green-500/10 text-green-600 border-green-200',
            REJECTED: 'bg-red-500/10 text-red-600 border-red-200',
          };
          return (
            <Badge
              className={`text-[10px] font-bold uppercase border ${colors[row.original.status] || ''}`}
            >
              {row.original.status}
            </Badge>
          );
        },
        meta: { 
          headerClassName: 'w-[90px]',
          skeleton: <Skeleton className="h-5 w-16 rounded" />,
        },
      },
      {
        accessorKey: 'updatedAt',
        size: 120,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Updated On" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-medium uppercase whitespace-nowrap">
            {formatDate(row.original.updatedAt, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        ),
        meta: { 
          headerClassName: 'w-[120px]',
          skeleton: <Skeleton className="h-4 w-24 rounded" />,
        },
      },
      {
        id: 'actions',
        size: 50,
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2 px-2">
            {row.original.status === 'PENDING' && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        mode="icon"
                        onClick={() =>
                          setDecisionTarget({
                            id: row.original.id,
                            name: row.original.employee?.name || 'Unknown',
                            type: 'approve',
                          })
                        }
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="size-8 text-success hover:bg-success/10 hover:text-success"
                      >
                        <Check className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Approve Request</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        mode="icon"
                        onClick={() =>
                          setDecisionTarget({
                            id: row.original.id,
                            name: row.original.employee?.name || 'Unknown',
                            type: 'reject',
                          })
                        }
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Reject Request</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="xs" mode="icon" className="size-8 hover:bg-muted">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link to={row.original.id}>
                    <Eye className="size-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>

                {row.original.status === 'PENDING' && (
                  <DropdownMenuItem asChild>
                    <Link to={`${row.original.id}/edit`}>
                      <Edit2 className="size-4 mr-2" />
                      Edit Request
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    setDeleteTarget({
                      id: row.original.id,
                      name: row.original.employee?.name || 'Unknown',
                    })
                  }
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete Request
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        meta: { 
          headerClassName: 'w-[100px] text-right',
          skeleton: (
            <div className="flex justify-end pr-2">
              <Skeleton className="size-8 rounded-md" />
            </div>
          ),
        },
      },
    ],
    [approveMutation, rejectMutation, deleteMutation]
  );

  const sorting = useMemo(() => [{ id: sortBy, desc: sortOrder === 'desc' }], [sortBy, sortOrder]);

  const table = useReactTable({
    data: data?.data || [],
    columns,
    pageCount: data?.pagination.totalPages || 1,
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
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
          sortBy: col.id === 'startDate' ? undefined : col.id,
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
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Employee Directory
            </div>
            <ToolbarPageTitle>Time Off Requests</ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="primary" size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                New Request
              </Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <div className="flex flex-col gap-6 pt-5">
        <Card>
          <CardHeader>
            <CardTitle>All PTO Requests</CardTitle>
            <CardToolbar>
              <div className="flex items-center gap-2.5">
                <InputWrapper variant="sm" className="w-64">
                  <Search className="size-4" />
                  <Input
                    placeholder="Search requests..."
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
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Filter className="size-3.5 mr-1.5" />
                  Filter
                </Button>
              </div>
            </CardToolbar>
          </CardHeader>

          <DataGrid
            table={table}
            recordCount={data?.pagination.totalItems || 0}
            isLoading={isLoading}
            loadingMode="skeleton"
            emptyMessage={
              <div className="flex flex-col items-center gap-2 py-12">
                <Calendar className="size-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground uppercase tracking-widest">
                  No requests found
                </p>
                <p className="text-xs text-muted-foreground">
                  Submit a new time off request to start tracking staff leave.
                </p>
              </div>
            }
            tableLayout={{
              width: 'fixed',
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Time Off Request"
        description={
          <>
            Are you sure you want to delete the time off request for{' '}
            <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete Request"
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

      <Dialog
        open={!!decisionTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDecisionTarget(null);
            setNote('');
            setNoteError(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decisionTarget?.type === 'approve' ? (
                <>
                  <Check className="size-5 text-success" /> Approve Request
                </>
              ) : (
                <>
                  <X className="size-5 text-destructive" /> Reject Request
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Confirm your decision for <strong>{decisionTarget?.name}</strong>. An internal note is
              required.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="note"
                className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
              >
                Internal Note <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="note"
                placeholder="Why are you making this decision?"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (e.target.value.trim()) setNoteError(false);
                }}
                className={`min-h-[100px] resize-none ${noteError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {noteError && (
                <p className="text-[10px] font-bold text-destructive uppercase tracking-widest animate-pulse">
                  Internal note is required
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecisionTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={decisionTarget?.type === 'approve' ? 'primary' : 'destructive'}
              onClick={handleDecisionSubmit}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {approveMutation.isPending || rejectMutation.isPending ? (
                <RefreshCcw className="size-4 mr-2 animate-spin" />
              ) : decisionTarget?.type === 'approve' ? (
                <Check className="size-4 mr-2" />
              ) : (
                <X className="size-4 mr-2" />
              )}
              Confirm {decisionTarget?.type === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
