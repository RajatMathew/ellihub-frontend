import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useAccess } from '@/app/contexts/access-context';
import {
  BudgetCard,
  ContractDetailsSimpleCard,
  ContractDocumentsSimpleCard,
  FinancialStatsBar,
  FinancialSummarySimpleCard,
  PaymentsPlaceholderCard,
  PrimeChangeOrdersCard,
  ProjectOverviewLoading,
  ProjectTeamDialog,
  ScheduleTrackerCard,
  usePrimeContractComputations,
} from '@/modules/project/components/overview';
import { ProjectToolbarHeader } from '@/modules/project/components/project-toolbar-header';
import {
  useDeleteProjectMutation,
  usePrimeChangeOrderFinancialSummaryQuery,
  usePrimeChangeOrdersQuery,
  useProjectDetailQuery,
  useProjectEmployeeOptionsQuery,
  useProjectFolderQuery,
  useProjectScheduleQuery,
} from '@/modules/project/hooks';
import {
  useAddContractAttachmentMutation,
  useContractAttachmentsQuery,
  useRemoveContractAttachmentMutation,
  useSetPrimaryContractAttachmentMutation,
} from '@/modules/project/hooks/contract-attachment.hooks';
import { usePOsQuery } from '@/modules/project/hooks/purchase-order';
import { useSCOsQuery } from '@/modules/project/hooks/sub-change-order';
import { useEmployeeOptions } from '@/modules/project/hooks/use-employee-options';
import { usePOCalculations } from '@/modules/project/hooks/use-po-calculations';
import { useTeamMemberActions } from '@/modules/project/hooks/use-team-member-actions';
import { EllipsisVertical, Pencil } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export default function ProjectContractOverview() {
  const { isAdmin } = useAccess();
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  /* ---- Queries ---- */
  const { data: project, isLoading } = useProjectDetailQuery(projectId);
  const { data: primeChangeOrderSummary } = usePrimeChangeOrderFinancialSummaryQuery(projectId);
  const { data: pcoList } = usePrimeChangeOrdersQuery({
    projectId,
    size: 5,
    sortBy: 'fieldwireUpdatedAt',
    sortOrder: 'desc',
  });
  const { data: allPOs } = usePOsQuery({ projectId, size: 1000 });
  const { data: allSCOs } = useSCOsQuery({ projectId, size: 1000 });
  const { data: attachments, isLoading: isLoadingAttachments } =
    useContractAttachmentsQuery(projectId);
  const { data: scheduleData, isLoading: isLoadingSchedule } = useProjectScheduleQuery(projectId);
  const { data: primeContractFolderId } = useProjectFolderQuery(
    projectId || undefined,
    'prime contract'
  );
  const employeesQuery = useProjectEmployeeOptionsQuery(projectId);
  const contract = project?.primeContract ?? undefined;

  /* ---- Mutations ---- */
  const deleteMutation = useDeleteProjectMutation();
  const addAttachmentMutation = useAddContractAttachmentMutation();
  const removeAttachmentMutation = useRemoveContractAttachmentMutation();
  const setPrimaryAttachmentMutation = useSetPrimaryContractAttachmentMutation();

  /* ---- Custom Hooks ---- */
  const { totalPOCommitted, activePOsCount } = usePOCalculations({
    pos: allPOs?.data,
  });
  const approvedSCOTotal = useMemo(
    () =>
      (allSCOs?.data ?? [])
        .filter((sco) => sco.status === 'APPROVED')
        .reduce((sum, sco) => sum + Number(sco.amount ?? 0), 0),
    [allSCOs?.data]
  );
  const totalSpent = totalPOCommitted + approvedSCOTotal;

  const computations = usePrimeContractComputations({
    project,
    contract,
    primeChangeOrderSummary,
    totalPOCommitted,
    totalSpent,
    invoiceSummary: undefined, // payments deferred to accounting module
  });

  const teamActions = useTeamMemberActions({ projectId });

  const employeeOptions = useEmployeeOptions({
    employees: employeesQuery.data,
    project,
  });

  /* ---- Event Handlers ---- */
  const handleDeleteProject = async () => {
    await deleteMutation.mutateAsync(projectId);
    navigate('/app/projects');
  };
  const handleAddContractDocument = async (fileId: string) => {
    await addAttachmentMutation.mutateAsync({ projectId, data: { fileId } });
  };
  const handleRemoveContractDocument = (attachmentId: string) => {
    removeAttachmentMutation.mutate({ projectId, attachmentId });
  };
  const handleSetPrimaryContractDocument = (attachmentId: string) => {
    setPrimaryAttachmentMutation.mutate({ projectId, attachmentId });
  };

  /* ---- Derived Data ---- */
  const recentPCOs = pcoList?.data ?? [];
  const docs = attachments ?? [];
  const canManageProject = project?.capabilities?.canManage ?? false;

  /* ---- Loading & Error States ---- */
  if (isLoading) return <ProjectOverviewLoading />;

  if (!project) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Project not found.</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-7.5">
      <div className="space-y-4">
        {/* ---- Toolbar ---- */}
        <ProjectToolbarHeader
          title={project.name}
          project={project}
          onTeamClick={() => setTeamDialogOpen(true)}
        >
          {/* <Button variant="outline" size="sm">
            <Share2 className="size-4" />
            Share
          </Button> */}
          {canManageProject && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/app/project/${projectId}/edit`}>
                  <Pencil className="size-4" />
                  Edit Project
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" mode="icon" size="sm">
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/app/project/${projectId}/edit`}>
                      <Pencil className="size-4" />
                      Edit Project
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        Delete Project
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </ProjectToolbarHeader>

        {/* ---- Financial Metrics Banner ---- */}
        <FinancialStatsBar
          computations={computations}
          contract={contract}
          primeChangeOrderSummary={primeChangeOrderSummary}
          totalPOCommitted={totalPOCommitted}
          activePOsCount={activePOsCount}
        />

        {/* ---- Contract Details + Financial Summary + Budget ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ContractDetailsSimpleCard project={project} />
          <FinancialSummarySimpleCard computations={computations} />
          <BudgetCard
            totalSpent={totalSpent}
            budgetLimit={computations.budgetLimit}
            targetBudgetPercent={computations.targetBudgetPercent}
          />
        </div>

        {/* ---- Contract Documents + Payments + Recent Activity ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ContractDocumentsSimpleCard
            documents={docs}
            isLoading={isLoadingAttachments}
            parentFolderId={primeContractFolderId}
            onAdd={canManageProject ? handleAddContractDocument : undefined}
            onSetPrimary={canManageProject ? handleSetPrimaryContractDocument : undefined}
            onRemove={canManageProject ? handleRemoveContractDocument : undefined}
            isAdding={addAttachmentMutation.isPending}
            isRemoving={removeAttachmentMutation.isPending}
            isSettingPrimary={setPrimaryAttachmentMutation.isPending}
          />
          <PaymentsPlaceholderCard />
          <PrimeChangeOrdersCard projectId={projectId} pcos={recentPCOs} isLoading={false} />
        </div>

        {/* ---- Team Dialog ---- */}
        <ProjectTeamDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          project={project}
          employeeOptions={employeeOptions}
          onAddMember={canManageProject ? teamActions.addMember : undefined}
          onRemoveMember={canManageProject ? teamActions.removeMember : undefined}
          onPromoteToPM={canManageProject ? teamActions.promoteToPM : undefined}
          isRemovingMember={teamActions.isRemovingMember}
          isPromoting={teamActions.isPromoting}
        />

        {/* ---- Schedule Tracker ---- */}
        <ScheduleTrackerCard
          projectId={projectId}
          contract={contract}
          entries={scheduleData ?? []}
          isLoading={isLoadingSchedule}
          parentFolderId={primeContractFolderId}
          canManage={canManageProject}
        />
      </div>

      {/* ---- Delete confirmation ---- */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteProject}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
