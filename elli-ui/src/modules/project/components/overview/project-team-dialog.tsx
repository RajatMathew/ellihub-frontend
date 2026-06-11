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
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';
import type {
  ProjectTeamAssignment,
  ProjectTeamRole,
} from '@/modules/project/schemas/project-team.schema';
import { UserPlus } from 'lucide-react';

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
        <DialogContent className="max-w-4xl">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-semibold">Project Team</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage team members and their roles
                </p>
              </div>
              {onAddMember && !showAddMember && hasMembers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                  className="shrink-0"
                >
                  <UserPlus className="size-4" />
                  Add Member
                </Button>
              )}
            </div>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {onAddMember && showAddMember && (
              <div className="pb-4 border-b">
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
                  <p className="text-sm font-medium text-muted-foreground">
                    {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
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
              <p className="text-sm text-muted-foreground">No team members assigned.</p>
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
