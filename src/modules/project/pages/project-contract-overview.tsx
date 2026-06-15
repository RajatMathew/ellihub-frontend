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
import { encodeFolderPath } from '@/modules/files/hooks/use-files-list-params';
import {
  BudgetCard,
  ContractDetailsSimpleCard,
  ContractDocumentsSimpleCard,
  FinancialStatsBar,
  FinancialSummarySimpleCard,
  PaymentsPlaceholderCard,
  PinPrimeContractDialog,
  PrimeChangeOrdersCard,
  ProjectOverviewLoading,
  ProjectTeamDialog,
  ScheduleTrackerCard,
  usePrimeContractComputations,
} from '@/modules/project/components/overview';
import { ProjectToolbarHeader } from '@/modules/project/components/project-toolbar-header';
import { getSubChangeOrderTotalAmount } from '@/modules/project/components/sub-change-order';
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
  useContractAttachmentsQuery,
  usePinPrimeContractsMutation,
  usePrimeContractCandidatesQuery,
  useSetPrimeContractPrimaryMutation,
  useUnpinPrimeContractsMutation,
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
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

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
  const { data: primeContractCandidates = [], isLoading: isLoadingPrimeContractCandidates } =
    usePrimeContractCandidatesQuery(projectId, pinDialogOpen);
  const { data: scheduleData, isLoading: isLoadingSchedule } = useProjectScheduleQuery(projectId);
  const { data: primeContractFolderId } = useProjectFolderQuery(
    projectId || undefined,
    'prime contract'
  );
  const contract = project?.primeContract ?? undefined;

  /* ---- Mutations ---- */
  const deleteMutation = useDeleteProjectMutation();
  const pinPrimeContractsMutation = usePinPrimeContractsMutation();
  const unpinPrimeContractsMutation = useUnpinPrimeContractsMutation();
  const setPrimeContractPrimaryMutation = useSetPrimeContractPrimaryMutation();

  /* ---- Custom Hooks ---- */
  const { totalPOCommitted, activePOsCount } = usePOCalculations({
    pos: allPOs?.data,
  });
  const approvedSCOs = useMemo(
    () => (allSCOs?.data ?? []).filter((sco) => sco.status === 'APPROVED'),
    [allSCOs?.data]
  );
  const approvedSCOTotal = useMemo(
    () => approvedSCOs.reduce((sum, sco) => sum + getSubChangeOrderTotalAmount(sco), 0),
    [approvedSCOs]
  );
  const totalCommitted = totalPOCommitted + approvedSCOTotal;
  const totalSpent = totalCommitted;

  const computations = usePrimeContractComputations({
    project,
    contract,
    primeChangeOrderSummary,
    totalPOCommitted,
    totalSpent,
    invoiceSummary: undefined, // payments deferred to accounting module
  });

  const teamActions = useTeamMemberActions({ projectId });

  /* ---- Derived Data ---- */
  const recentPCOs = pcoList?.data ?? [];
  const docs = attachments ?? [];
  const primeContractFolderUrl = primeContractFolderId
    ? `/app/project/${projectId}/files?${new URLSearchParams({
        folderId: primeContractFolderId,
        folderPath: encodeFolderPath([{ id: primeContractFolderId, name: 'Prime Contract' }]) ?? '',
      }).toString()}`
    : undefined;
  const canManageProject = project?.capabilities?.canManage ?? false;
  const projectTeamActions = project?.capabilities?.actions?.projectTeam;
  const canAddTeamMembers = projectTeamActions?.add === true;
  const canRemoveTeamMembers = projectTeamActions?.remove === true;
  const canUpdateTeamRoles =
    projectTeamActions?.['assign-role'] === true || projectTeamActions?.['transfer-lead'] === true;
  const primeContractActions = project?.capabilities?.actions?.primeContract;
  const canPinPrimeContracts = primeContractActions?.pin === true;
  const canUnpinPrimeContracts = primeContractActions?.unpin === true;
  const canSetPrimaryPrimeContracts = primeContractActions?.primary === true;
  const employeesQuery = useProjectEmployeeOptionsQuery(projectId, canAddTeamMembers);

  const employeeOptions = useEmployeeOptions({
    employees: employeesQuery.data,
    project,
  });

  /* ---- Event Handlers ---- */
  const handleDeleteProject = async () => {
    await deleteMutation.mutateAsync(projectId);
    navigate('/app/projects');
  };
  const handlePinContractDocuments = (fileIds: string[]) => {
    pinPrimeContractsMutation.mutate(
      { projectId, fileIds },
      { onSuccess: () => setPinDialogOpen(false) }
    );
  };
  const handleUploadAndPinContractDocument = async (fileId: string) => {
    await pinPrimeContractsMutation.mutateAsync({ projectId, fileIds: [fileId] });
  };
  const handleUnpinContractDocument = (attachmentId: string) => {
    unpinPrimeContractsMutation.mutate({ projectId, primeContractIds: [attachmentId] });
  };
  const handleSetPrimaryContractDocument = (attachmentId: string, isPrimary: boolean) => {
    setPrimeContractPrimaryMutation.mutate({
      projectId,
      primeContractIds: [attachmentId],
      isPrimary,
    });
  };

  /* ---- Loading & Error States ---- */
  if (isLoading) return <ProjectOverviewLoading />;

  if (!project) {
    return (
      <div className="container-fluid min-h-[calc(100vh-var(--header-height))] bg-muted/20 py-7.5">
        <div className="text-sm text-muted-foreground">Project not found.</div>
      </div>
    );
  }

  return (
    <div className="container-fluid min-h-[calc(100vh-var(--header-height))] bg-muted/20 py-7.5">
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
          totalCommitted={totalCommitted}
          activePOsCount={activePOsCount}
          approvedSCOsCount={approvedSCOs.length}
        />

        {/* ---- Contract Details + Financial Summary + Budget ---- */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ContractDetailsSimpleCard project={project} />
          <FinancialSummarySimpleCard computations={computations} />
          <BudgetCard
            totalSpent={totalSpent}
            budgetLimit={computations.budgetLimit}
            targetBudgetPercent={computations.targetBudgetPercent}
            className="md:col-span-2 xl:col-span-1"
          />
        </div>

        {/* ---- Contract Documents + Payments + Recent Activity ---- */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ContractDocumentsSimpleCard
            documents={docs}
            isLoading={isLoadingAttachments}
            documentsUrl={primeContractFolderUrl}
            parentFolderId={primeContractFolderId}
            onUploadAndPin={canPinPrimeContracts ? handleUploadAndPinContractDocument : undefined}
            onPinClick={canPinPrimeContracts ? () => setPinDialogOpen(true) : undefined}
            onUnpin={canUnpinPrimeContracts ? handleUnpinContractDocument : undefined}
            onSetPrimary={
              canSetPrimaryPrimeContracts ? handleSetPrimaryContractDocument : undefined
            }
            isAdding={pinPrimeContractsMutation.isPending}
            isRemoving={unpinPrimeContractsMutation.isPending}
            isSettingPrimary={setPrimeContractPrimaryMutation.isPending}
          />
          <PaymentsPlaceholderCard />
          <PrimeChangeOrdersCard
            projectId={projectId}
            pcos={recentPCOs}
            isLoading={false}
            className="md:col-span-2 xl:col-span-1"
          />
        </div>

        {/* ---- Team Dialog ---- */}
        <ProjectTeamDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          project={project}
          employeeOptions={employeeOptions}
          onAddMember={canAddTeamMembers ? teamActions.addMember : undefined}
          onRemoveMember={canRemoveTeamMembers ? teamActions.removeMember : undefined}
          onUpdateRole={canUpdateTeamRoles ? teamActions.updateRole : undefined}
          isRemovingMember={teamActions.isRemovingMember}
          isUpdatingRole={teamActions.isUpdatingRole}
        />

        {/* ---- Schedule Tracker ---- */}
        <ScheduleTrackerCard
          project={project}
          projectId={projectId}
          contract={contract}
          entries={scheduleData ?? []}
          isLoading={isLoadingSchedule}
          parentFolderId={primeContractFolderId}
          canManage={canManageProject}
        />

        <PinPrimeContractDialog
          open={pinDialogOpen}
          onOpenChange={setPinDialogOpen}
          candidates={primeContractCandidates}
          isLoading={isLoadingPrimeContractCandidates}
          isSubmitting={pinPrimeContractsMutation.isPending}
          onPin={handlePinContractDocuments}
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
