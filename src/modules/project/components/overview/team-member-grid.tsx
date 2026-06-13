import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type {
  ProjectTeamAssignment,
  ProjectTeamRole,
} from '@/modules/project/schemas/project-team.schema';
import { Mail, Trash2 } from 'lucide-react';

const ROLE_OPTIONS: ProjectTeamRole[] = ['Lead PM', 'PM', 'Member'];

interface TeamMemberGridProps {
  teamMembers: ProjectTeamAssignment[];
  canAssignRole?: boolean;
  canTransferLead?: boolean;
  canRemoveMember?: boolean;
  canRemovePM?: boolean;
  canRemoveLeadPM?: boolean;
  onRoleChange?: (member: ProjectTeamAssignment, role: ProjectTeamRole) => void;
  onRemoveMember?: (employeeId: string) => void;
  isUpdatingRole?: boolean;
  isRemoving?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getMemberRole(member: ProjectTeamAssignment): ProjectTeamRole {
  if (member.isLead || member.role === 'Lead PM') return 'Lead PM';
  if (member.role === 'PM') return 'PM';
  return 'Member';
}

function getRoleOptions(
  member: ProjectTeamAssignment,
  role: ProjectTeamRole,
  canTransferLead: boolean
): ProjectTeamRole[] {
  const allowedOptions =
    member.employee?.authRole === 'pm'
      ? canTransferLead
        ? ROLE_OPTIONS
        : ROLE_OPTIONS.filter((option) => option !== 'Lead PM')
      : (['Member'] satisfies ProjectTeamRole[]);

  return allowedOptions.includes(role) ? allowedOptions : [role, ...allowedOptions];
}

function canRemoveRole(
  role: ProjectTeamRole,
  canRemoveMember: boolean,
  canRemovePM: boolean,
  canRemoveLeadPM: boolean
) {
  if (role === 'Lead PM') return canRemoveLeadPM;
  if (role === 'PM') return canRemovePM;
  return canRemoveMember;
}

export function TeamMemberGrid({
  teamMembers,
  canAssignRole = false,
  canTransferLead = false,
  canRemoveMember = false,
  canRemovePM = false,
  canRemoveLeadPM = false,
  onRoleChange,
  onRemoveMember,
  isUpdatingRole = false,
  isRemoving = false,
}: TeamMemberGridProps) {
  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="hidden grid-cols-[minmax(0,1fr)_9rem_2.5rem] items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
        <span>Member</span>
        <span>Role</span>
        <span className="text-right">Action</span>
      </div>
      {teamMembers.map((member) => {
        const name = member.employee?.name ?? 'Unknown';
        const email = member.employee?.email;
        const role = getMemberRole(member);
        const authRole = member.employee?.authRole ?? 'unlinked';
        const roleOptions = getRoleOptions(member, role, canTransferLead);
        const canChangeThisRole =
          !!onRoleChange && canAssignRole && role !== 'Lead PM' && roleOptions.length > 1;
        const canRemoveThisRole =
          !!onRemoveMember &&
          role !== 'Lead PM' &&
          canRemoveRole(role, canRemoveMember, canRemovePM, canRemoveLeadPM);

        return (
          <div
            key={member.employeeId}
            className="grid gap-3 border-b p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_9rem_2.5rem] md:items-center"
          >
            <div className="flex min-w-0 items-start gap-3 md:items-center">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="min-w-0 truncate text-sm font-semibold">{name}</span>
                  <Badge variant={authRole === 'pm' ? 'primary' : 'secondary'} appearance="light">
                    {authRole === 'unlinked' ? 'Unlinked' : authRole.toUpperCase()}
                  </Badge>
                </div>
                {email && (
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="size-3 shrink-0" />
                    <span className="min-w-0 truncate break-all sm:break-normal">{email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:contents">
              <Select
                value={role}
                disabled={!canChangeThisRole || isUpdatingRole}
                onValueChange={(value) => onRoleChange?.(member, value as ProjectTeamRole)}
              >
                <SelectTrigger className="h-9 min-w-0 flex-1 md:h-8 md:w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                mode="icon"
                size="sm"
                disabled={!canRemoveThisRole || isRemoving}
                onClick={() => onRemoveMember?.(member.employeeId)}
                aria-label={`Remove ${name} from project team`}
                className="size-9 shrink-0 text-destructive disabled:text-muted-foreground md:size-8"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
