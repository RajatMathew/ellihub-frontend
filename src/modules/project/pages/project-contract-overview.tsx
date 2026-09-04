import { useMemo, useState } from 'react';

import { EntityActivitySheet } from '@/app/components/entity-activity-sheet';
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
  MasterScheduleCard,
  PaymentsPlaceholderCard,
  PinPrimeContractDialog,
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
  useProjectBudgetSummaryQuery,
  useProjectDetailQuery,
  useProjectFolderQuery,
  useProjectMasterScheduleQuery,
  useProjectScheduleQuery,
  useRemoveProjectMasterScheduleMutation,
  useSetProjectMasterScheduleMutation,
} from '@/modules/project/hooks';
import {
  useContractAttachmentsQuery,
  usePinPrimeContractsMutation,
  usePrimeContractCandidatesQuery,
  useSetPrimeContractPrimaryMutation,
  useUnpinPrimeContractsMutation,
} from '@/modules/project/hooks/contract-attachment.hooks';
import { usePOStatsQuery } from '@/modules/project/hooks/purchase-order';
import { useSCOStatsQuery } from '@/modules/project/hooks/sub-change-order';
import { useProjectTeamEmployeePickerOptions } from '@/modules/project/hooks/use-project-team-employee-picker-options';
import { useTeamMemberActions } from '@/modules/project/hooks/use-team-member-actions';
import { EllipsisVertical, History, Pencil } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export default function ProjectContractOverview() {
  const { isAdmin, can } = useAccess();
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  /* ---- Queries ---- */
  const { data: project, isLoading } = useProjectDetailQuery(projectId);
  const { data: budgetSummary } = useProjectBudgetSummaryQuery(projectId);
  const { data: primeChangeOrderSummary } = usePrimeChangeOrderFinancialSummaryQuery(projectId);
  const { data: pcoList } = usePrimeChangeOrdersQuery({
    projectId,
    size: 5,
    sortBy: 'fieldwireUpdatedAt',
    sortOrder: 'desc',
  });
  const { data: poStats } = usePOStatsQuery(projectId);
  const { data: scoStats } = useSCOStatsQuery(projectId);
  const { data: attachments, isLoading: isLoadingAttachments } =
    useContractAttachmentsQuery(projectId);
  const { data: primeContractCandidates = [], isLoading: isLoadingPrimeContractCandidates } =
    usePrimeContractCandidatesQuery(projectId, pinDialogOpen);
  const { data: scheduleData, isLoading: isLoadingSchedule } = useProjectScheduleQuery(projectId);
  const { data: masterScheduleData, isLoading: isLoadingMasterSchedule } =
    useProjectMasterScheduleQuery(projectId);
  const { data: primeContractFolderId } = useProjectFolderQuery(
    projectId || undefined,
    'prime contract'
  );
  const { data: masterScheduleFolderId } = useProjectFolderQuery(
    projectId || undefined,
    'master schedule'
  );
  const contract = project?.primeContract ?? undefined;

  /* ---- Mutations ---- */
  const deleteMutation = useDeleteProjectMutation();
  const pinPrimeContractsMutation = usePinPrimeContractsMutation();
  const unpinPrimeContractsMutation = useUnpinPrimeContractsMutation();
  const setPrimeContractPrimaryMutation = useSetPrimeContractPrimaryMutation();
  const setMasterScheduleMutation = useSetProjectMasterScheduleMutation();
  const removeMasterScheduleMutation = useRemoveProjectMasterScheduleMutation();

  /* ---- Custom Hooks ---- */
  const totalCommitted = budgetSummary?.committedTotal ?? poStats?.totalCommitted ?? 0;
  const approvedSCOTotal = scoStats?.approvedAmount ?? 0;
  const totalPOCommitted =
    budgetSummary?.committedPurchaseOrdersTotal ?? totalCommitted - approvedSCOTotal;
  const activePOsCount =
    (poStats?.issuedPurchaseOrders ?? 0) + (poStats?.deliveredPurchaseOrders ?? 0);
  const approvedSCOsCount = scoStats?.approvedSubChangeOrders ?? 0;
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
  const masterSchedule =
    masterScheduleData === undefined ? (project?.masterSchedule ?? null) : masterScheduleData;
  const primeContractFolderUrl = primeContractFolderId
    ? `/app/project/${projectId}/files?${new URLSearchParams({
        folderId: primeContractFolderId,
      }).toString()}`
    : undefined;
  const canManageProject = project?.capabilities?.canManage ?? false;
  const canViewActivity = can('activityLog', 'read');
  const canManageSchedule = project?.capabilities?.canManageSchedule ?? false;
  const masterScheduleActions = project?.capabilities?.actions?.projectMasterSchedule;
  const canUpdateMasterSchedule = masterScheduleActions?.update === true;
  const canDeleteMasterSchedule = masterScheduleActions?.delete === true;
  const canManageMasterSchedule = canUpdateMasterSchedule || canDeleteMasterSchedule;
  const projectTeamActions = project?.capabilities?.actions?.projectTeam;
  const canAddTeamMembers = projectTeamActions?.add === true;
  const canRemoveTeamMembers = projectTeamActions?.remove === true;
  const canUpdateTeamRoles =
    projectTeamActions?.['assign-role'] === true || projectTeamActions?.['transfer-lead'] === true;
  const primeContractActions = project?.capabilities?.actions?.primeContract;
  const canPinPrimeContracts = primeContractActions?.pin === true;
  const canUnpinPrimeContracts = primeContractActions?.unpin === true;
  const canSetPrimaryPrimeContracts = primeContractActions?.primary === true;
  const existingEmployeeIds = useMemo(
    () =>
      new Set(
        [
          ...(project?.teamMembers ?? []).map((member) => member.employeeId),
          project?.leadPMId,
        ].filter((value): value is string => Boolean(value))
      ),
    [project]
  );
  const employeePicker = useProjectTeamEmployeePickerOptions({
    projectId,
    search: employeeSearch,
    enabled: canAddTeamMembers && teamDialogOpen,
  });
  const employeeOptions = useMemo(
    () => employeePicker.options.filter((option) => !existingEmployeeIds.has(option.value)),
    [employeePicker.options, existingEmployeeIds]
  );

  /* ---- Event Handlers ---- */
  const handleDeleteProject = () => {
    // Deleting a project can now be refused: the API returns an error naming
    // the RFQs, purchase orders, sub change orders, invoices or prime change
    // orders still held by it, rather than soft-deleting the project and
    // leaving those records behind.
    //
    // So this cannot use `mutateAsync` and await. `ConfirmDialog` types
    // `onConfirm` as `() => void` and calls it bare, so a rejected promise had
    // nowhere to go and surfaced as an unhandled rejection (and a Sentry
    // event). `mutate` keeps the failure inside the mutation, where `onError`
    // already toasts the server's message, and only navigates on success.
    deleteMutation.mutate(projectId, {
      onSuccess: () => navigate('/app/projects'),
    });
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
  const handleUploadAndSetMasterSchedule = async (fileId: string) => {
    await setMasterScheduleMutation.mutateAsync({ projectId, data: { fileId } });
  };
  const handleRemoveMasterSchedule = async () => {
    await removeMasterScheduleMutation.mutateAsync({ projectId });
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
          {canViewActivity && (
            <Button variant="outline" size="sm" onClick={() => setActivityOpen(true)}>
              <History className="size-4" />
              Activity
            </Button>
          )}
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
          approvedSCOsCount={approvedSCOsCount}
        />

        {/* ---- Contract Details + Financial Summary + Budget ---- */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ContractDetailsSimpleCard project={project} />
          <FinancialSummarySimpleCard computations={computations} />
          <BudgetCard
            totalCommitted={totalCommitted}
            budgetLimit={budgetSummary?.budgetLimit ?? computations.budgetLimit}
            targetBudgetPercent={
              budgetSummary?.targetBudgetPercent ?? computations.targetBudgetPercent
            }
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
          employeeSearch={employeeSearch}
          onEmployeeSearchChange={setEmployeeSearch}
          isLoadingEmployees={employeePicker.isLoading}
          isEmployeeFetchingNextPage={employeePicker.isFetchingNextPage}
          hasMoreEmployees={employeePicker.hasNextPage}
          onFetchMoreEmployees={employeePicker.fetchNextPage}
          onAddMember={canAddTeamMembers ? teamActions.addMember : undefined}
          onRemoveMember={canRemoveTeamMembers ? teamActions.removeMember : undefined}
          onUpdateRole={canUpdateTeamRoles ? teamActions.updateRole : undefined}
          isRemovingMember={teamActions.isRemovingMember}
          isUpdatingRole={teamActions.isUpdatingRole}
        />

        {/* ---- Master Schedule ---- */}
        <MasterScheduleCard
          masterSchedule={masterSchedule}
          isLoading={isLoadingMasterSchedule}
          parentFolderId={masterScheduleFolderId}
          folderUrl={
            masterScheduleFolderId
              ? `/app/project/${projectId}/files?${new URLSearchParams({
                  folderId: masterScheduleFolderId,
                }).toString()}`
              : undefined
          }
          canManage={canManageMasterSchedule}
          onUploadAndSet={canUpdateMasterSchedule ? handleUploadAndSetMasterSchedule : undefined}
          onRemove={canDeleteMasterSchedule ? handleRemoveMasterSchedule : undefined}
          isSaving={setMasterScheduleMutation.isPending}
          isRemoving={removeMasterScheduleMutation.isPending}
        />

        {/* ---- Schedule Tracker ---- */}
        <ScheduleTrackerCard
          project={project}
          projectId={projectId}
          contract={contract}
          entries={scheduleData ?? []}
          isLoading={isLoadingSchedule}
          parentFolderId={primeContractFolderId}
          canManage={canManageSchedule}
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

      <EntityActivitySheet
        open={activityOpen}
        onOpenChange={setActivityOpen}
        entityType="project"
        entityId={projectId}
        entityName={project.name}
        title="Project Activity"
        description="Project updates, schedule tracker changes, and related records."
        emptyMessage="No project activity recorded yet."
      />

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
