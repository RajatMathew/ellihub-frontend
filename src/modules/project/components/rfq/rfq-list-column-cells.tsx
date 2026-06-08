import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { formatDate } from '@/app/lib/helpers';
import {
  getRFQStatusLabel,
  getRFQStatusName,
  getRFQTrackLabel,
} from '@/modules/project/components/rfq/rfq-list-utils';
import { getRfqStatusVariant } from '@/modules/project/constants/rfq';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import type { RFQListItem } from '@/modules/project/schemas/rfq';
import { FilePlus2, MoreHorizontal } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export function RFQNumberCell({ rfq }: { rfq: RFQListItem }) {
  return (
    <Link to={`${rfq.id}`} className="text-sm font-semibold text-foreground hover:text-primary">
      {rfq.rfqNumber ?? '-'}
    </Link>
  );
}

export function RFQTitleCell({ rfq }: { rfq: RFQListItem }) {
  return (
    <Link
      to={`${rfq.id}`}
      className="block max-w-72 truncate text-sm font-medium text-foreground hover:text-primary"
    >
      {rfq.title}
    </Link>
  );
}

export function RFQTrackCell({ rfq }: { rfq: RFQListItem }) {
  return <span className="text-xs font-semibold tracking-normal">{getRFQTrackLabel(rfq)}</span>;
}

export function RFQStatusCell({ rfq }: { rfq: RFQListItem }) {
  const statusName = getRFQStatusName(rfq);

  if (!statusName) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <Badge variant={getRfqStatusVariant(statusName)} appearance="light" size="sm">
      {getRFQStatusLabel(rfq)}
    </Badge>
  );
}

export function RFQBidDeadlineCell({ rfq }: { rfq: RFQListItem }) {
  return (
    <span className="text-sm text-muted-foreground">
      {rfq.bidDeadline ? formatDate(rfq.bidDeadline) : '-'}
    </span>
  );
}

export function RFQVendorsCell({ rfq }: { rfq: RFQListItem }) {
  const invites = rfq._count?.invites ?? 0;

  return (
    <span className="text-sm text-muted-foreground">
      {invites} vendor{invites === 1 ? '' : 's'}
    </span>
  );
}

export function RFQQuotesCell({ rfq }: { rfq: RFQListItem }) {
  const quotes = rfq._count?.quotes ?? 0;

  if (quotes <= 0) {
    return <span className="text-xs text-muted-foreground">0 quotes</span>;
  }

  return (
    <Link to={`${rfq.id}`} className="text-xs font-semibold text-primary">
      {quotes} quote{quotes === 1 ? '' : 's'}
    </Link>
  );
}

interface RFQActionsCellProps {
  rfq: RFQListItem;
  onDelete: (rfq: RFQListItem) => void;
  onVoid: (rfq: RFQListItem) => void;
  onCreatePO: (rfq: RFQListItem) => void;
}

export function RFQActionsCell({ rfq, onDelete, onVoid, onCreatePO }: RFQActionsCellProps) {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const projectActions = project?.capabilities?.actions;
  const statusName = getRFQStatusName(rfq);
  const canEdit = projectActions?.rfq?.update === true && statusName === 'DRAFT';
  const canCreatePO = projectActions?.purchaseOrder?.create === true && statusName === 'AWARDED';
  const canDelete = projectActions?.rfq?.delete === true && statusName === 'DRAFT';
  const canVoid =
    projectActions?.rfq?.void === true && (statusName === 'PUBLISHED' || statusName === 'AWARDED');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          mode="icon"
          size="sm"
          className="size-7"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link to={`${rfq.id}`}>View</Link>
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem asChild>
            <Link to={`${rfq.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
        )}
        {canCreatePO && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onCreatePO(rfq)}>
              <FilePlus2 className="size-4" />
              Create PO from RFQ
            </DropdownMenuItem>
          </>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(rfq)}>
              Delete
            </DropdownMenuItem>
          </>
        )}
        {canVoid && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onVoid(rfq)}>
              Void
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
