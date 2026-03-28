import { useState } from 'react';

import { UserPlus } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';

import { AddTeamMemberForm } from './add-team-member-form';
import { EmptyTeamState } from './empty-team-state';
import { TeamMemberGrid } from './team-member-grid';
import { useFilteredTeamMembers } from '@modules/project/hooks/use-filtered-team-members';
import type { ProjectDetail } from '@modules/project/schemas/project.schema';

interface EmployeeOption {
  value: string;
  label: string;
}

interface ProjectTeamCardProps {
  project: ProjectDetail;
  employeeOptions: EmployeeOption[];
  onAddMember: (employeeId: string) => Promise<void>;
  onRemoveMember: (employeeId: string) => Promise<void>;
  onPromoteToPM: (employeeId: string) => Promise<void>;
  isRemovingMember?: boolean;
  isPromoting?: boolean;
}

export function ProjectTeamCard({
  project,
  employeeOptions,
  onAddMember,
  onRemoveMember,
  onPromoteToPM,
  isRemovingMember = false,
  isPromoting = false,
}: ProjectTeamCardProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const { teamMembers, totalMembers, hasMembers } = useFilteredTeamMembers({ project });

  const handleAddMember = async (employeeId: string) => {
    await onAddMember(employeeId);
    setShowAddMember(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Project Team ({totalMembers})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddMember(true)}
          disabled={showAddMember}
        >
          <UserPlus className="size-4" />
          Add Member
        </Button>
      </CardHeader>
      <CardContent>
        {showAddMember && (
          <AddTeamMemberForm
            employeeOptions={employeeOptions}
            onAdd={handleAddMember}
            onCancel={() => setShowAddMember(false)}
          />
        )}

        {hasMembers ? (
          <TeamMemberGrid
            leadPM={project.leadPM}
            teamMembers={teamMembers}
            onPromoteToPM={onPromoteToPM}
            onRemoveMember={onRemoveMember}
            isPromoting={isPromoting}
            isRemoving={isRemovingMember}
          />
        ) : (
          <EmptyTeamState onAddMember={() => setShowAddMember(true)} />
        )}
      </CardContent>
    </Card>
  );
}
