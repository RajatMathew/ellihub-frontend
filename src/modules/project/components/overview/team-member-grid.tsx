import { Mail, Trash2 } from 'lucide-react';

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

function getRoleOptions(member: ProjectTeamAssignment, canTransferLead: boolean): ProjectTeamRole[] {
  if (member.employee?.authRole !== 'pm') return ['Member'];
  return canTransferLead ? ROLE_OPTIONS : ROLE_OPTIONS.filter((role) => role !== 'Lead PM');
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
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-[minmax(0,1fr)_10rem_3rem] items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <span>Member</span>
        <span>Role</span>
        <span className="text-right">Action</span>
      </div>
      {teamMembers.map((member) => {
        const name = member.employee?.name ?? 'Unknown';
        const email = member.employee?.email;
        const role = getMemberRole(member);
        const authRole = member.employee?.authRole ?? 'unlinked';
        const roleOptions = getRoleOptions(member, canTransferLead);
        const canChangeThisRole =
          !!onRoleChange && canAssignRole && role !== 'Lead PM' && roleOptions.length > 1;
        const canRemoveThisRole =
          !!onRemoveMember &&
          role !== 'Lead PM' &&
          canRemoveRole(role, canRemoveMember, canRemovePM, canRemoveLeadPM);

        return (
          <div
            key={member.employeeId}
            className="grid grid-cols-[minmax(0,1fr)_10rem_3rem] items-center gap-3 border-b px-3 py-3 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold">{name}</span>
                  <Badge variant={authRole === 'pm' ? 'primary' : 'secondary'} appearance="light">
                    {authRole === 'unlinked' ? 'Unlinked' : authRole.toUpperCase()}
                  </Badge>
                </div>
                {email && (
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                )}
              </div>
            </div>

            <Select
              value={role}
              disabled={!canChangeThisRole || isUpdatingRole}
              onValueChange={(value) => onRoleChange?.(member, value as ProjectTeamRole)}
            >
              <SelectTrigger className="h-8">
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

            <div className="flex justify-end">
              <Button
                variant="ghost"
                mode="icon"
                size="sm"
                disabled={!canRemoveThisRole || isRemoving}
                onClick={() => onRemoveMember?.(member.employeeId)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
