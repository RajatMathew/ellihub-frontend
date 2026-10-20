import { RowActions } from '@/app/components/data-table';
import { ImportedBadge } from '@/app/components/import-source';
import { StatusBadge } from '@/app/components/status-badge';
import { ListingIdentifierLink } from '@/app/components/ui/listing-identifier';
import { formatDateOnly } from '@/app/lib/dates';
import {
  canDeleteRFQ,
  getRFQStatusLabel,
  getRFQStatusName,
  getRFQTrackLabel,
} from '@/modules/project/components/rfq/rfq-list-utils';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import type { RFQListItem } from '@/modules/project/schemas/rfq';
import { FilePlus2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export function RFQNumberCell({ rfq }: { rfq: RFQListItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ListingIdentifierLink to={`${rfq.id}`} value={rfq.rfqNumber} className="text-sm" />
      <ImportedBadge source={rfq.importSource} />
    </div>
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

  return <StatusBadge label={getRFQStatusLabel(rfq)} status={statusName} />;
}

export function RFQDateCell({ rfq }: { rfq: RFQListItem }) {
  return (
    <span className="text-sm text-muted-foreground">
      {formatDateOnly(rfq.rfqDate, undefined, '-')}
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
  // Stays a component because the available actions come from a query.
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const projectActions = project?.capabilities?.actions;
  const statusName = getRFQStatusName(rfq);

  return (
    <RowActions
      label={rfq.rfqNumber ?? 'RFQ'}
      items={[
        { label: 'View', to: `${rfq.id}` },
        projectActions?.rfq?.update === true && { label: 'Edit', to: `${rfq.id}/edit` },
        projectActions?.purchaseOrder?.create === true &&
          statusName === 'AWARDED' && {
            icon: FilePlus2,
            label: 'Create PO from RFQ',
            onSelect: () => onCreatePO(rfq),
          },
        projectActions?.rfq?.delete === true &&
          canDeleteRFQ(rfq) && {
            destructive: true,
            label: 'Delete',
            onSelect: () => onDelete(rfq),
          },
        projectActions?.rfq?.void === true &&
          (statusName === 'PUBLISHED' || statusName === 'AWARDED') && {
            destructive: true,
            label: 'Void',
            onSelect: () => onVoid(rfq),
          },
      ]}
    />
  );
}
