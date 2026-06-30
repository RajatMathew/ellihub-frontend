import { Badge, type BadgeProps } from '@/app/components/ui/badge';
import type { PTOStatus } from '@/modules/hr/schemas/pto.schema';

interface PTOStatusBadgeProps {
  status: PTOStatus;
}

const statusVariant: Record<PTOStatus, BadgeProps['variant']> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

export function PTOStatusBadge({ status }: PTOStatusBadgeProps) {
  return (
    <Badge
      variant={statusVariant[status]}
      appearance="outline"
      className="text-xs font-semibold uppercase"
    >
      {status.toLowerCase()}
    </Badge>
  );
}
