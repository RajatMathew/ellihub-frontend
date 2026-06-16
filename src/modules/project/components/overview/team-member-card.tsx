import { Crown, EllipsisVertical, Mail, X } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

import type { ProjectDetail } from '@/modules/project/schemas/project.schema';
import type { ProjectTeamAssignment } from '@/modules/project/schemas/project-team.schema';

interface TeamMemberCardProps {
  member: ProjectTeamAssignment;
  isLeadPM?: boolean;
  onPromoteToPM?: (employeeId: string) => void;
  onRemove?: (employeeId: string) => void;
  isPromoting?: boolean;
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

export function TeamMemberCard({
  member,
  isLeadPM = false,
  onPromoteToPM,
  onRemove,
  isPromoting = false,
  isRemoving = false,
}: TeamMemberCardProps) {
  const name = member.employee?.name ?? 'Unknown';
  const email = member.employee?.email;

  return (
    <div className="group relative flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-border-hover hover:shadow-sm">
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold truncate">{name}</h4>
          {isLeadPM && (
            <Badge variant="primary" appearance="light" size="sm" className="shrink-0">
              <Crown className="size-3" />
              Lead PM
            </Badge>
          )}
        </div>
        {email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        )}
        {!isLeadPM && member.role && (
          <div className="mt-1">
            <span className="text-xs text-muted-foreground/80">{member.role}</span>
          </div>
        )}
      </div>

      {!isLeadPM && (onPromoteToPM || onRemove) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              mode="icon"
              size="sm"
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onPromoteToPM && (
              <>
                <DropdownMenuItem
                  onClick={() => onPromoteToPM(member.employeeId)}
                  disabled={isPromoting}
                >
                  <Crown className="size-4" />
                  Make Lead PM
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {onRemove && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRemove(member.employeeId)}
                disabled={isRemoving}
              >
                <X className="size-4" />
                Remove from team
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface LeadPMCardProps {
  leadPM: ProjectDetail['leadPM'];
}

export function LeadPMCard({ leadPM }: LeadPMCardProps) {
  if (!leadPM) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="text-sm font-medium bg-primary/20 text-primary">
          {getInitials(leadPM.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold truncate">{leadPM.name}</h4>
          <Badge variant="primary" appearance="light" size="sm" className="shrink-0">
            <Crown className="size-3" />
            Lead PM
          </Badge>
        </div>
        {leadPM.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{leadPM.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}
