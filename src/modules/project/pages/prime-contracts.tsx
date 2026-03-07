import { useState } from 'react';

import {
  Calendar,
  DollarSign,
  FileText,
  Pencil,
  Percent,
  Receipt,
} from 'lucide-react';
import { useParams } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { Separator } from '@app/components/ui/separator';
import { StatsCard } from '@app/components/ui/stats-card';
import { formatCurrency, formatDate } from '@app/lib/helpers';

import { InfoRow } from '@modules/project/components/info-row';
import { PageLoadingSkeleton } from '@modules/project/components/page-loading-skeleton';
import { ProjectToolbarHeader } from '@modules/project/components/project-toolbar-header';
import { ContractDocumentsCard } from '@modules/project/components/prime-contract/contract-documents-card';
import { ContractEditDialog } from '@modules/project/components/prime-contract/contract-edit-dialog';
import { ScheduleTrackerCard } from '@modules/project/components/prime-contract/schedule-tracker-card';
import { PAYMENT_TERMS_LABELS } from '@modules/project/constants/project.constants';
import {
  useAddContractAttachmentMutation,
  useContractAttachmentsQuery,
  useProjectContractQuery,
  useProjectDetailQuery,
  useProjectScheduleQuery,
  useRemoveContractAttachmentMutation,
  useUpsertProjectContractMutation,
} from '@modules/project/hooks';
import type { UpsertPrimeContractInput } from '@modules/project/schemas/project-contract.schema';

export default function PrimeContracts() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Queries
  const projectQuery = useProjectDetailQuery(projectId);
  const contractQuery = useProjectContractQuery(projectId);
  const attachmentsQuery = useContractAttachmentsQuery(projectId);
  const scheduleQuery = useProjectScheduleQuery(projectId);

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

  if (isLoading) return <PageLoadingSkeleton />;

  return (
    <div className="container-fluid py-7.5">
      <div className="space-y-6">
        <ProjectToolbarHeader title="Prime Contract" project={project}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="size-4" />
            Edit Contract
          </Button>
        </ProjectToolbarHeader>

        <Separator />

        {/* ---- Stats Cards ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<DollarSign className="size-5 text-success" />}
            bgClass="bg-success/10"
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
            icon={<Receipt className="size-5 text-info" />}
            bgClass="bg-info/10"
            label="Payment Terms"
            value={
              contract?.paymentTerms
                ? (PAYMENT_TERMS_LABELS[contract.paymentTerms] ?? contract.paymentTerms)
                : '—'
            }
            description={`${attachmentsQuery.data?.length ?? 0} document(s) attached`}
          />
          <StatsCard
            icon={<Calendar className="size-5 text-warning" />}
            bgClass="bg-warning/10"
            label="Schedule"
            value={`${scheduleQuery.data?.data?.length ?? 0} entries`}
            description={
              contract?.estimatedStartDate
                ? `Start: ${formatDate(contract.estimatedStartDate)}`
                : 'No dates set'
            }
          />
        </div>

        {/* ---- Main content grid ---- */}
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
                {contract?.contractValue != null
                  ? formatCurrency(contract.contractValue)
                  : '—'}
              </InfoRow>
              {contract?.contractType && (
                <InfoRow label="Contract Type">{contract.contractType}</InfoRow>
              )}
              <InfoRow label="Retainage %">
                {contract?.retainagePercent != null
                  ? `${contract.retainagePercent}%`
                  : '—'}
              </InfoRow>
              <InfoRow label="Target Budget %">
                {contract?.targetBudgetPercent != null
                  ? `${contract.targetBudgetPercent}%`
                  : '—'}
              </InfoRow>
              <InfoRow label="Payment Terms">
                {contract?.paymentTerms
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
                {contract?.estimatedStartDate
                  ? formatDate(contract.estimatedStartDate)
                  : '—'}
              </InfoRow>
              <InfoRow label="Est. Completion Date">
                {contract?.estimatedCompletionDate
                  ? formatDate(contract.estimatedCompletionDate)
                  : '—'}
              </InfoRow>
              <Separator className="my-2" />
              <InfoRow label="Actual Start Date">
                {contract?.actualStartDate
                  ? formatDate(contract.actualStartDate)
                  : '—'}
              </InfoRow>
              <InfoRow label="Actual Completion Date">
                {contract?.actualCompletionDate
                  ? formatDate(contract.actualCompletionDate)
                  : '—'}
              </InfoRow>
              {!contract && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FileText className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No contract set up yet.</p>
                </div>
              )}
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
          />
        </div>

        {/* Schedule Tracker — full width */}
        <ScheduleTrackerCard
          projectId={projectId}
          contract={contractQuery.data}
          entries={scheduleQuery.data?.data ?? []}
          isLoading={scheduleQuery.isLoading}
        />
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
