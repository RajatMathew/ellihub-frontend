import { TeamMemberCard, LeadPMCard } from './team-member-card';
import type { ProjectDetail } from '@modules/project/schemas/project.schema';
import type { ProjectTeamAssignment } from '@modules/project/schemas/project-team.schema';

interface TeamMemberGridProps {
  leadPM: ProjectDetail['leadPM'];
  teamMembers: ProjectTeamAssignment[];
  onPromoteToPM: (employeeId: string) => Promise<void>;
  onRemoveMember: (employeeId: string) => Promise<void>;
  isPromoting?: boolean;
  isRemoving?: boolean;
}

export function TeamMemberGrid({
  leadPM,
  teamMembers,
  onPromoteToPM,
  onRemoveMember,
  isPromoting = false,
  isRemoving = false,
}: TeamMemberGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {leadPM && <LeadPMCard leadPM={leadPM} />}
      {teamMembers.map((tm) => (
        <TeamMemberCard
          key={tm.employeeId}
          member={tm}
          onPromoteToPM={onPromoteToPM}
          onRemove={onRemoveMember}
          isPromoting={isPromoting}
          isRemoving={isRemoving}
        />
      ))}
    </div>
  );
}
