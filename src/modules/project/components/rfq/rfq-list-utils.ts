import { RFQ_TRACK_LABELS } from '@/modules/project/constants/rfq';
import type { RFQListItem } from '@/modules/project/schemas/rfq';

export function getRFQStatusName(rfq: RFQListItem) {
  const { status } = rfq;

  if (typeof status === 'object' && status !== null) {
    return status.name ?? '';
  }

  return status ?? '';
}

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
