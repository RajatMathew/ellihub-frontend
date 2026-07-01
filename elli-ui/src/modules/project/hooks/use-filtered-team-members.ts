import { useMemo } from 'react';

import type { ProjectTeamAssignment } from '@/modules/project/schemas/project-team.schema';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';

interface UseFilteredTeamMembersParams {
  project: ProjectDetail;
}

function isVisibleProjectTeamMember(member: ProjectTeamAssignment) {
  const authRole = member.employee?.authRole;
  return authRole === 'pm' || authRole === 'user';
}

export function useFilteredTeamMembers({ project }: UseFilteredTeamMembersParams) {
  return useMemo(() => {
    const leadPMId = project.leadPMId;

    const teamMembers = (project.teamMembers ?? []).filter(
      (teamMember) => teamMember.employeeId !== leadPMId && isVisibleProjectTeamMember(teamMember)
    );

    const totalMembers = teamMembers.length + (project.leadPM ? 1 : 0);
    const hasMembers = !!project.leadPM || teamMembers.length > 0;

    return {
      teamMembers,
      totalMembers,
      hasMembers,
    };
  }, [project]);
}
