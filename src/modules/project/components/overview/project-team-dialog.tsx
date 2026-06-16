import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { useFilteredTeamMembers } from '@/modules/project/hooks/use-filtered-team-members';
import type {
  ProjectTeamAssignment,
  ProjectTeamRole,
} from '@/modules/project/schemas/project-team.schema';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';
import { UserPlus, Users } from 'lucide-react';

import { AddTeamMemberForm } from './add-team-member-form';
import { EmptyTeamState } from './empty-team-state';
import { TeamMemberGrid } from './team-member-grid';

interface EmployeeOption {
  value: string;
  label: string;
}

interface ProjectTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDetail;
  employeeOptions: EmployeeOption[];
  onAddMember?: (employeeId: string) => Promise<void>;
  onRemoveMember?: (employeeId: string) => Promise<void>;
  onUpdateRole?: (employeeId: string, role: ProjectTeamRole) => Promise<void>;
  isRemovingMember?: boolean;
  isUpdatingRole?: boolean;
}

export function ProjectTeamDialog({
  open,
  onOpenChange,
  project,
  employeeOptions,
  onAddMember,
  onRemoveMember,
  onUpdateRole,
  isRemovingMember = false,
  isUpdatingRole = false,
}: ProjectTeamDialogProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [pendingRemoveMember, setPendingRemoveMember] = useState<{
    employeeId: string;
    name: string;
  } | null>(null);
  const [pendingLeadTransfer, setPendingLeadTransfer] = useState<ProjectTeamAssignment | null>(
    null
  );
  const { totalMembers, hasMembers } = useFilteredTeamMembers({ project });
  const allTeamMembers =
    project.teamMembers?.length || !project.leadPM
      ? (project.teamMembers ?? [])
      : [
          {
            projectId: project.id,
            employeeId: project.leadPM.id,
            role: 'Lead PM' as const,
            isLead: true,
            employee: project.leadPM,
          },
        ];
  const teamActions = project.capabilities?.actions?.projectTeam;
  const canAssignRole = teamActions?.['assign-role'] === true;
  const canTransferLead = teamActions?.['transfer-lead'] === true;
  const canRemoveMember = teamActions?.removeMember === true || teamActions?.remove === true;
  const canRemovePM = teamActions?.removePM === true;
  const canRemoveLeadPM = teamActions?.removeLeadPM === true;

  const handleAddMember = async (employeeId: string) => {
    if (!onAddMember) return;
    await onAddMember(employeeId);
    setShowAddMember(false);
  };
  const handleConfirmRemoveMember = async () => {
    if (!onRemoveMember || !pendingRemoveMember) return;
    await onRemoveMember(pendingRemoveMember.employeeId);
    setPendingRemoveMember(null);
  };
  const handleRoleChange = (member: ProjectTeamAssignment, role: ProjectTeamRole) => {
    if (!onUpdateRole) return;
    if (role === 'Lead PM') {
      setPendingLeadTransfer(member);
      return;
    }
    void onUpdateRole(member.employeeId, role);
  };

  const handleConfirmLeadTransfer = async () => {
    if (!onUpdateRole || !pendingLeadTransfer) return;
    await onUpdateRole(pendingLeadTransfer.employeeId, 'Lead PM');
    setPendingLeadTransfer(null);
  };
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(86vh,760px)] w-[calc(100vw-1rem)] max-w-4xl gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] lg:w-full">
          <DialogHeader className="mb-0 border-b px-4 py-4 pr-12 sm:py-5 sm:pl-5 sm:pr-14">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Users className="size-4" />
                </div>
                <div className="min-w-0 text-left">
                  <DialogTitle className="text-base font-semibold sm:text-lg">
                    Project Team
                  </DialogTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
                    </span>
                    {project.leadPM?.name && (
                      <span className="min-w-0 truncate">Lead PM: {project.leadPM.name}</span>
                    )}
                  </div>
                </div>
              </div>
              {onAddMember && !showAddMember && hasMembers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                  className="w-full shrink-0 justify-center sm:w-auto"
                >
                  <UserPlus className="size-4" />
                  Add Member
                </Button>
              )}
            </div>
          </DialogHeader>
          <DialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {onAddMember && showAddMember && (
              <div className="rounded-md border bg-muted/20 p-3 sm:p-4">
                <AddTeamMemberForm
                  employeeOptions={employeeOptions}
                  onAdd={handleAddMember}
                  onCancel={() => setShowAddMember(false)}
                />
              </div>
            )}

            {hasMembers ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Team Members
                  </p>
                </div>
                <TeamMemberGrid
                  teamMembers={allTeamMembers}
                  canAssignRole={canAssignRole}
                  canTransferLead={canTransferLead}
                  canRemoveMember={canRemoveMember}
                  canRemovePM={canRemovePM}
                  canRemoveLeadPM={canRemoveLeadPM}
                  onRoleChange={onUpdateRole ? handleRoleChange : undefined}
                  onRemoveMember={
                    onRemoveMember
                      ? (employeeId) => {
                          const member = allTeamMembers.find(
                            (item) => item.employeeId === employeeId
                          );
                          setPendingRemoveMember({
                            employeeId,
                            name: member?.employee?.name ?? 'this team member',
                          });
                        }
                      : undefined
                  }
                  isUpdatingRole={isUpdatingRole}
                  isRemoving={isRemovingMember}
                />
              </div>
            ) : onAddMember ? (
              <EmptyTeamState onAddMember={() => setShowAddMember(true)} />
            ) : (
              <div className="rounded-md border border-dashed py-10 text-center">
                <p className="text-sm text-muted-foreground">No team members assigned.</p>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingRemoveMember)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingRemoveMember(null);
        }}
        title="Remove Team Member"
        description={
          <>
            Remove <strong>{pendingRemoveMember?.name ?? 'this team member'}</strong> from this
            project?
          </>
        }
        confirmLabel="Remove"
        onConfirm={handleConfirmRemoveMember}
        variant="destructive"
        isPending={isRemovingMember}
      />
      <ConfirmDialog
        open={Boolean(pendingLeadTransfer)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingLeadTransfer(null);
        }}
        title="Transfer Lead PM"
        description={
          <>
            Transfer Lead PM from <strong>{project.leadPM?.name ?? 'the current Lead PM'}</strong>{' '}
            to <strong>{pendingLeadTransfer?.employee?.name ?? 'this team member'}</strong>? The
            current Lead PM will become PM.
          </>
        }
        confirmLabel="Transfer"
        onConfirm={handleConfirmLeadTransfer}
        isPending={isUpdatingRole}
      />
    </>
  );
}
