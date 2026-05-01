import { useState } from 'react';

import { UserPlus } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';

import { AddTeamMemberForm } from './add-team-member-form';
import { EmptyTeamState } from './empty-team-state';
import { TeamMemberGrid } from './team-member-grid';
import { useFilteredTeamMembers } from '@/modules/project/hooks/use-filtered-team-members';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';

interface EmployeeOption {
  value: string;
  label: string;
}

interface ProjectTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDetail;
  employeeOptions: EmployeeOption[];
  onAddMember: (employeeId: string) => Promise<void>;
  onRemoveMember: (employeeId: string) => Promise<void>;
  onPromoteToPM: (employeeId: string) => Promise<void>;
  isRemovingMember?: boolean;
  isPromoting?: boolean;
}

export function ProjectTeamDialog({
  open,
  onOpenChange,
  project,
  employeeOptions,
  onAddMember,
  onRemoveMember,
  onPromoteToPM,
  isRemovingMember = false,
  isPromoting = false,
}: ProjectTeamDialogProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const { teamMembers, totalMembers, hasMembers } = useFilteredTeamMembers({ project });

  const handleAddMember = async (employeeId: string) => {
    await onAddMember(employeeId);
    setShowAddMember(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Project Team
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage team members and their roles
              </p>
            </div>
            {!showAddMember && hasMembers && (
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
          {showAddMember && (
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
                leadPM={project.leadPM}
                teamMembers={teamMembers}
                onPromoteToPM={onPromoteToPM}
                onRemoveMember={onRemoveMember}
                isPromoting={isPromoting}
                isRemoving={isRemovingMember}
              />
            </div>
          ) : (
            <EmptyTeamState onAddMember={() => setShowAddMember(true)} />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
