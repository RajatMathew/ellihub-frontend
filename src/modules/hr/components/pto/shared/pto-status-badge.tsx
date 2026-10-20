import { StatusBadge } from '@/app/components/status-badge';
import type { PTOStatus } from '@/modules/hr/schemas/pto.schema';

interface PTOStatusBadgeProps {
  status: PTOStatus;
}

/**
 * PTO's statuses are the shared vocabulary — `PENDING`, `APPROVED`, `REJECTED`
 * all resolve through `statusTone`, so this is now a label wrapper rather than a
 * fourth copy of the status → variant map.
 */
export function PTOStatusBadge({ status }: PTOStatusBadgeProps) {
  return <StatusBadge status={status} />;
}
