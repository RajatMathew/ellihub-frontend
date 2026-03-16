import { useMemo, useState } from 'react';

import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Calendar,
  DollarSign,
  FileText,
  MoreHorizontal,
  Pencil,
  Percent,
  Plus,
  Receipt,
} from 'lucide-react';
import { useParams } from 'react-router-dom';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardTable } from '@app/components/ui/card';
import { DataGrid } from '@app/components/ui/data-grid';
import { DataGridColumnHeader } from '@app/components/ui/data-grid-column-header';
import { DataGridTable } from '@app/components/ui/data-grid-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Separator } from '@app/components/ui/separator';
import { Skeleton } from '@app/components/ui/skeleton';
import { StatsCard } from '@app/components/ui/stats-card';
import { formatCurrency, formatDate } from '@app/lib/helpers';

import { InfoRow } from '@modules/project/components/info-row';
import { PageLoadingSkeleton } from '@modules/project/components/page-loading-skeleton';
import { ProjectToolbarHeader } from '@modules/project/components/project-toolbar-header';
import { ContractDocumentsCard } from '@modules/project/components/prime-contract/contract-documents-card';
import { ContractEditDialog } from '@modules/project/components/prime-contract/contract-edit-dialog';
import { PAYMENT_TERMS_LABELS } from '@modules/project/constants/project.constants';
import {
  useAddContractAttachmentMutation,
  useContractAttachmentsQuery,
  useProjectContractQuery,
  useProjectDetailQuery,
  useProjectFolderQuery,
  useRemoveContractAttachmentMutation,
  useUpsertProjectContractMutation,
} from '@modules/project/hooks';
import type { PrimeContract } from '@modules/project/schemas/project-contract.schema';
import type { UpsertPrimeContractInput } from '@modules/project/schemas/project-contract.schema';

/* ---- Contract row type (wraps PrimeContract with active flag) ---- */

interface ContractRow extends PrimeContract {
  isActive: boolean;
}

export default function PrimeContracts() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Queries
  const projectQuery = useProjectDetailQuery(projectId);
  const contractQuery = useProjectContractQuery(projectId);
  const attachmentsQuery = useContractAttachmentsQuery(projectId);
  const primeContractFolderQuery = useProjectFolderQuery(projectId, 'prime contract');

  // Mutations
  const upsertContractMutation = useUpsertProjectContractMutation();
  const addAttachmentMutation = useAddContractAttachmentMutation();
  const removeAttachmentMutation = useRemoveContractAttachmentMutation();

  const handleSaveContract = (data: UpsertPrimeContractInput) => {
    upsertContractMutation.mutate(
      { projectId, data },
      { onSuccess: () => setEditDialogOpen(false) },
    );
  };

  const handleAddAttachment = (fileId: string) => {
    addAttachmentMutation.mutate({ projectId, data: { fileId } });
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    removeAttachmentMutation.mutate({ projectId, attachmentId });
  };

  const project = projectQuery.data;
  const contract = contractQuery.data;
  const isLoading = projectQuery.isLoading || contractQuery.isLoading;

  /* ---- Table: wrap the single contract into a row array ---- */
  // When the backend supports multiple contracts, replace this with a list query
  const contractRows: ContractRow[] = useMemo(() => {
    if (!contract) return [];
    return [{ ...contract, isActive: true }];
  }, [contract]);

  /* ---- Column definitions ---- */
  const columns = useMemo<ColumnDef<ContractRow>[]>(
    () => [
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          row.original.isActive ? (
            <Badge variant="success" size="sm">Active</Badge>
          ) : (
            <Badge variant="secondary" size="sm">Inactive</Badge>
          )
        ),
        meta: {
          headerClassName: 'w-[90px]',
          skeleton: <Skeleton className="h-4 w-14" />,
        },
      },
      {
        accessorKey: 'contractType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {row.original.contractType || 'Prime Contract'}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[140px]',
          skeleton: <Skeleton className="h-4 w-28" />,
        },
      },
      {
        accessorKey: 'contractValue',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Contract Value" />,
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(row.original.contractValue)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[140px]',
          skeleton: <Skeleton className="h-4 w-24" />,
        },
      },
      {
        accessorKey: 'retainagePercent',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Retainage" />,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.retainagePercent != null ? `${row.original.retainagePercent}%` : '—'}
          </span>
        ),
        meta: {
          headerClassName: 'w-[100px]',
          skeleton: <Skeleton className="h-4 w-12" />,
        },
      },
      {
        accessorKey: 'paymentTerms',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Payment Terms" />,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.paymentTerms
              ? (PAYMENT_TERMS_LABELS[row.original.paymentTerms] ?? row.original.paymentTerms)
              : '—'}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[130px]',
          skeleton: <Skeleton className="h-4 w-20" />,
        },
      },
      {
        accessorKey: 'estimatedStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.estimatedStartDate
              ? formatDate(row.original.estimatedStartDate)
              : '—'}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[110px]',
          skeleton: <Skeleton className="h-4 w-20" />,
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdAt ? formatDate(row.original.createdAt) : '—'}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[100px]',
          skeleton: <Skeleton className="h-4 w-20" />,
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="size-7 p-0">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.original.isActive && (
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="size-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        meta: {
          headerClassName: 'w-[50px]',
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: contractRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <PageLoadingSkeleton />;

  return (
    <div className="container-fluid py-7.5">
      <div className="space-y-6">
        <ProjectToolbarHeader title="Prime Contracts" project={project}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
          >
            {contract ? (
              <>
                <Pencil className="size-4" />
                Edit Contract
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Add Contract
              </>
            )}
          </Button>
        </ProjectToolbarHeader>

        {/* ---- Stats Cards ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<DollarSign className="size-5 text-emerald-500" />}
            bgClass="bg-emerald-500/10"
            label="Contract Value"
            value={formatCurrency(contract?.contractValue ?? 0)}
            description={contract?.contractType ?? 'Prime Contract'}
          />
          <StatsCard
            icon={<Percent className="size-5 text-primary" />}
            bgClass="bg-primary/10"
            label="Retainage"
            value={contract?.retainagePercent != null ? `${contract.retainagePercent}%` : '—'}
            description={
              contract?.targetBudgetPercent != null
                ? `Target Budget: ${contract.targetBudgetPercent}%`
                : 'No target budget set'
            }
          />
          <StatsCard
            icon={<Receipt className="size-5 text-blue-500" />}
            bgClass="bg-blue-500/10"
            label="Payment Terms"
            value={
              contract?.paymentTerms
                ? (PAYMENT_TERMS_LABELS[contract.paymentTerms] ?? contract.paymentTerms)
                : '—'
            }
            description={`${attachmentsQuery.data?.length ?? 0} document(s) attached`}
          />
          <StatsCard
            icon={<Calendar className="size-5 text-amber-500" />}
            bgClass="bg-amber-500/10"
            label="Duration"
            value={
              contract?.estimatedStartDate && contract?.estimatedCompletionDate
                ? `${Math.ceil((new Date(contract.estimatedCompletionDate).getTime() - new Date(contract.estimatedStartDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                : '—'
            }
            description={
              contract?.estimatedStartDate
                ? `Start: ${formatDate(contract.estimatedStartDate)}`
                : 'No dates set'
            }
          />
        </div>

        {/* ---- Detail cards for active contract ---- */}
        {contract && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Contract Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Contract Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Contract Value">
                  {formatCurrency(contract.contractValue)}
                </InfoRow>
                {contract.contractType && (
                  <InfoRow label="Contract Type">{contract.contractType}</InfoRow>
                )}
                <InfoRow label="Retainage %">
                  {contract.retainagePercent != null
                    ? `${contract.retainagePercent}%`
                    : '—'}
                </InfoRow>
                <InfoRow label="Target Budget %">
                  {contract.targetBudgetPercent != null
                    ? `${contract.targetBudgetPercent}%`
                    : '—'}
                </InfoRow>
                <InfoRow label="Payment Terms">
                  {contract.paymentTerms
                    ? (PAYMENT_TERMS_LABELS[contract.paymentTerms] ?? contract.paymentTerms)
                    : '—'}
                </InfoRow>
                <Separator className="my-2" />
                <InfoRow label="General Contractor">{project?.gc?.name ?? '—'}</InfoRow>
                <InfoRow label="Project Manager">{project?.leadPM?.name ?? '—'}</InfoRow>
              </CardContent>
            </Card>

            {/* Contract Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Contract Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Est. Start Date">
                  {contract.estimatedStartDate
                    ? formatDate(contract.estimatedStartDate)
                    : '—'}
                </InfoRow>
                <InfoRow label="Est. Completion Date">
                  {contract.estimatedCompletionDate
                    ? formatDate(contract.estimatedCompletionDate)
                    : '—'}
                </InfoRow>
                <Separator className="my-2" />
                <InfoRow label="Actual Start Date">
                  {contract.actualStartDate
                    ? formatDate(contract.actualStartDate)
                    : '—'}
                </InfoRow>
                <InfoRow label="Actual Completion Date">
                  {contract.actualCompletionDate
                    ? formatDate(contract.actualCompletionDate)
                    : '—'}
                </InfoRow>
              </CardContent>
            </Card>

            {/* Contract Documents */}
            <ContractDocumentsCard
              attachments={attachmentsQuery.data ?? []}
              isLoading={attachmentsQuery.isLoading}
              onAdd={handleAddAttachment}
              onRemove={handleRemoveAttachment}
              isAdding={addAttachmentMutation.isPending}
              isRemoving={removeAttachmentMutation.isPending}
              parentFolderId={primeContractFolderQuery.data}
            />
          </div>
        )}

        {/* ---- Contracts Table ---- */}
        <DataGrid table={table} recordCount={contractRows.length}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Contracts
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {contractRows.length} contract{contractRows.length !== 1 ? 's' : ''}
              </span>
            </CardHeader>
            <CardTable>
              <DataGridTable table={table} />
            </CardTable>
            {contractRows.length === 0 && (
              <CardContent>
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <FileText className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No contracts yet.</p>
                  <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                    <Plus className="size-4" />
                    Add Contract
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </DataGrid>
      </div>

      <ContractEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        contract={contractQuery.data}
        onSubmit={handleSaveContract}
        isSubmitting={upsertContractMutation.isPending}
      />
    </div>
  );
}
