import { Badge } from '@/app/components/ui/badge';
import { getPTOStatusTone } from '@/modules/hr/components/pto/shared/pto-utils';
import type { PTOStatus } from '@/modules/hr/schemas/pto.schema';

interface PTOStatusBadgeProps {
  status: PTOStatus;
}

export function PTOStatusBadge({ status }: PTOStatusBadgeProps) {
  return (
    <Badge className={`border text-xs font-bold uppercase ${getPTOStatusTone(status)}`}>
      {status}
    </Badge>
  );
}
