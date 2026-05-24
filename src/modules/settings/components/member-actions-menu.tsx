import { MoreHorizontal, Pencil, ShieldCheck, Trash2, UserRound } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { normalizeMemberRole } from '@/modules/settings/lib/members.utils';
import type { MemberRole, MemberUser } from '@/modules/settings/schemas/members.schema';

interface MemberActionsMenuProps {
  member: MemberUser;
  currentUserId?: string;
  onEdit: (member: MemberUser) => void;
  onRoleChange: (member: MemberUser, role: MemberRole) => void;
  onRemove: (member: MemberUser) => void;
}

export function MemberActionsMenu({
  member,
  currentUserId,
  onEdit,
  onRoleChange,
  onRemove,
}: MemberActionsMenuProps) {
  const role = normalizeMemberRole(member.role);
  const isSelf = member.id === currentUserId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" mode="icon" size="sm">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(member)}>
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSelf || role === 'dev'}
          onClick={() => onRoleChange(member, 'dev')}
        >
          <ShieldCheck className="size-4" />
          Make Dev
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSelf || role === 'admin'}
          onClick={() => onRoleChange(member, 'admin')}
        >
          <ShieldCheck className="size-4" />
          Make Admin
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSelf || role === 'accountant'}
          onClick={() => onRoleChange(member, 'accountant')}
        >
          <UserRound className="size-4" />
          Make Accountant
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSelf || role === 'user'}
          onClick={() => onRoleChange(member, 'user')}
        >
          <UserRound className="size-4" />
          Make User
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isSelf} onClick={() => onRemove(member)}>
          <Trash2 className="size-4" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

