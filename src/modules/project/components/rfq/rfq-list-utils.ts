import { RFQ_TRACK_LABELS } from '@/modules/project/constants/rfq';
import type { RFQListItem } from '@/modules/project/schemas/rfq';

export function getRFQStatusName(rfq: RFQListItem) {
  const { status } = rfq;

  if (typeof status === 'object' && status !== null) {
    return status.name ?? '';
  }

  return status ?? '';
}

/**
 * Only a draft RFQ can be deleted — the same rule the API enforces. Anything
 * issued has been sent to vendors, and is voided rather than deleted. Shared by
 * the row menu and by bulk selection so the two cannot disagree.
 */
export function canDeleteRFQ(rfq: RFQListItem) {
  return getRFQStatusName(rfq) === 'DRAFT';
}

export const RFQ_DELETE_BLOCKED_REASON =
  'Only draft RFQs can be deleted. Void an issued RFQ instead.';

export function getRFQStatusLabel(rfq: RFQListItem) {
  const { status } = rfq;

  if (typeof status === 'object' && status !== null) {
    return status.label ?? status.name ?? '-';
  }

  return status ?? '-';
}

export function getRFQTrackValue(rfq: RFQListItem) {
  return rfq.track || rfq.type?.label || '';
}

export function getRFQTrackLabel(rfq: RFQListItem) {
  const track = getRFQTrackValue(rfq);

  return track ? (RFQ_TRACK_LABELS[track] ?? track) : '-';
}
