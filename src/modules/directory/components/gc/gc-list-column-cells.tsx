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
import { getInitials } from '@/app/lib/helpers';
import {
  getGCPrimaryContact,
  getGCTypeCode,
  getGCTypeLabel,
} from '@/modules/directory/components/gc/gc-list-utils';
import {
  GC_STATUS_COLORS,
  GC_STATUS_LABELS,
  GC_TYPE_BADGE_VARIANTS,
} from '@/modules/directory/constants/gc/gc-list.constants';
import type { GeneralContractor } from '@/modules/directory/schemas/gc.schema';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

export function GCNameCell({ gc }: { gc: GeneralContractor }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link
        to={`${gc.id}`}
        className="break-words text-sm font-semibold uppercase text-foreground hover:text-primary"
      >
        {gc.name}
      </Link>
      {gc.website && (
        <a
          href={gc.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-center gap-1 break-all text-2sm text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="size-3 shrink-0" />
          {gc.website.replace(/^https?:\/\//, '')}
        </a>
      )}
    </div>
  );
}

export function GCTypeCell({
  gc,
  typeLabels,
}: {
  gc: GeneralContractor;
  typeLabels: Map<string, string>;
}) {
  const typeCode = getGCTypeCode(gc.gcType);
  const variant =
    typeCode && typeCode in GC_TYPE_BADGE_VARIANTS ? GC_TYPE_BADGE_VARIANTS[typeCode] : 'primary';
  const fallback = gc.gcTypeId ? typeLabels.get(gc.gcTypeId) : null;

  return (
    <Badge variant={variant} appearance="outline" size="sm">
      {getGCTypeLabel(gc.gcType, fallback)}
    </Badge>
  );
}

export function GCStatusCell({ gc }: { gc: GeneralContractor }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`size-2 rounded-full ${GC_STATUS_COLORS[gc.status] ?? 'bg-muted-foreground'}`}
      />
      <span className="text-sm text-foreground">{GC_STATUS_LABELS[gc.status] ?? gc.status}</span>
    </div>
  );
}

export function GCPrimaryContactCell({ gc }: { gc: GeneralContractor }) {
  const contact = getGCPrimaryContact(gc);
  const displayName = contact?.fullName || gc.name;
  const displayEmail = contact?.email?.[0]?.email || gc.email;

  if (!contact && !displayEmail) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="text-xs font-semibold">
          {getInitials(displayName, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="break-words text-sm font-medium text-foreground">{displayName}</span>
        {displayEmail && (
          <a
            href={`mailto:${displayEmail}`}
            className="break-all text-2sm text-muted-foreground hover:text-primary"
          >
            {displayEmail}
          </a>
        )}
      </div>
    </div>
  );
}

export function GCActiveProjectsCell({ gc }: { gc: GeneralContractor }) {
  return (
    <span className="block text-center text-sm font-medium text-foreground">
      {gc.activeProjects}
    </span>
  );
}

export function GCActionsCell({
  gc,
  onDelete,
}: {
  gc: GeneralContractor;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          mode="icon"
          size="sm"
          className="size-7"
          onClick={(event) => event.stopPropagation()}
          aria-label={`Open actions for ${gc.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <Link to={`${gc.id}`}>View</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`${gc.id}/edit`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(gc.id)}
        >
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
