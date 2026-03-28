import { useState } from 'react';

import { EllipsisVertical, Pencil, Share2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { useEmployeesQuery } from '@app/hooks/use-employees';

import {
  BudgetCard,
  ContractDetailsSimpleCard,
  ContractDocumentsSimpleCard,
  FinancialStatsBar,
  FinancialSummarySimpleCard,
  PaymentsPlaceholderCard,
  PrimeChangeOrdersCard,
  ProjectTeamDialog,
} from '@modules/project/components/overview';
import { PageLoadingSkeleton } from '@modules/project/components/page-loading-skeleton';
import { usePrimeContractComputations } from '@modules/project/components/prime-contract/use-prime-contract-computations';
import { ScheduleTrackerCard } from '@modules/project/components/prime-contract/schedule-tracker-card';
import { ProjectToolbarHeader } from '@modules/project/components/project-toolbar-header';
import { useContractAttachmentsQuery } from '@modules/project/hooks/contract-attachment.hooks';
import {
  useDeleteProjectMutation,
  useProjectDetailQuery,
  useProjectContractQuery,
  useProjectScheduleQuery,
  useProjectFolderQuery,
} from '@modules/project/hooks';
import { usePCOListQuery, usePCOPipelineQuery } from '@modules/project/hooks/pco.hooks';
import { useEmployeeOptions } from '@modules/project/hooks/use-employee-options';
import { usePOCalculations } from '@modules/project/hooks/use-po-calculations';
import { useTeamMemberActions } from '@modules/project/hooks/use-team-member-actions';
import { usePOsQuery } from '@modules/purchase-orders/hooks/po.hooks';

export default function ProjectContractOverview() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  /* ---- Queries ---- */
  const { data: project, isLoading } = useProjectDetailQuery(projectId);
  const { data: contract } = useProjectContractQuery(projectId);
  const { data: pipeline } = usePCOPipelineQuery(projectId);
  const { data: pcoList } = usePCOListQuery({
    projectId,
    size: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: allPOs } = usePOsQuery({ projectId, size: 1000 });
  const { data: attachments } = useContractAttachmentsQuery(projectId);
  const { data: scheduleData, isLoading: isLoadingSchedule } =
    useProjectScheduleQuery(projectId);
  const { data: primeContractFolderId } = useProjectFolderQuery(
    projectId || undefined,
    'prime contract'
  );
  const employeesQuery = useEmployeesQuery({ size: 1000 });

  /* ---- Mutations ---- */
  const deleteMutation = useDeleteProjectMutation();

  /* ---- Custom Hooks ---- */
  const computations = usePrimeContractComputations({
    contract,
    pipeline,
    invoiceSummary: undefined, // payments deferred to accounting module
  });

  const { totalPOCommitted, activePOsCount } = usePOCalculations({
    pos: allPOs?.data,
  });

  const teamActions = useTeamMemberActions({ projectId });

  const employeeOptions = useEmployeeOptions({
    employees: employeesQuery.data?.data,
    project,
  });

  /* ---- Event Handlers ---- */
  const handleDeleteProject = async () => {
    await deleteMutation.mutateAsync(projectId);
    navigate('/app/projects');
  };

  /* ---- Derived Data ---- */
  const recentPCOs = pcoList?.data ?? [];
  const docs = attachments ?? [];

  /* ---- Loading & Error States ---- */
  if (isLoading) return <PageLoadingSkeleton />;

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
          <Button variant="outline" size="sm">
            <Share2 className="size-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/app/projects/${projectId}/edit`}>
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
                <Link to={`/app/projects/${projectId}/edit`}>
                  <Pencil className="size-4" />
                  Edit Project
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ProjectToolbarHeader>

        {/* ---- Financial Metrics Banner ---- */}
        <FinancialStatsBar
          computations={computations}
          contract={contract}
          pipeline={pipeline}
          totalPOCommitted={totalPOCommitted}
          activePOsCount={activePOsCount}
        />

        {/* ---- Contract Details + Financial Summary + Budget ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ContractDetailsSimpleCard project={project} />
          <FinancialSummarySimpleCard computations={computations} />
          <BudgetCard
            totalSpent={totalPOCommitted}
            budgetLimit={computations.budgetLimit}
            targetBudgetPercent={computations.targetBudgetPercent}
          />
        </div>

        {/* ---- Contract Documents + Payments + Recent Activity ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ContractDocumentsSimpleCard
            projectId={projectId}
            documents={docs}
            isLoading={false}
          />
          <PaymentsPlaceholderCard />
          <PrimeChangeOrdersCard
            projectId={projectId}
            pcos={recentPCOs}
            isLoading={false}
          />
        </div>

        {/* ---- Team Dialog ---- */}
        <ProjectTeamDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          project={project}
          employeeOptions={employeeOptions}
          onAddMember={teamActions.addMember}
          onRemoveMember={teamActions.removeMember}
          onPromoteToPM={teamActions.promoteToPM}
          isRemovingMember={teamActions.isRemovingMember}
          isPromoting={teamActions.isPromoting}
        />

        {/* ---- Schedule Tracker ---- */}
        <ScheduleTrackerCard
          projectId={projectId}
          contract={contract}
          entries={scheduleData?.data ?? []}
          isLoading={isLoadingSchedule}
          parentFolderId={primeContractFolderId}
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
