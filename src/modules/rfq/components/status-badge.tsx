import { Badge } from '@app/components/ui/badge';

import type { VendorStatus } from '@modules/rfq/types';

export function StatusBadge({ status }: { status: VendorStatus }) {
  const map: Record<
    VendorStatus,
    {
      label: string;
      variant: 'success' | 'warning' | 'secondary';
      appearance: 'light' | 'outline';
    }
  > = {
    QUOTED: { label: 'Quoted', variant: 'success', appearance: 'light' },
    WAITING: { label: 'Waiting', variant: 'warning', appearance: 'light' },
    DECLINED: { label: 'Declined', variant: 'secondary', appearance: 'outline' },
  };
  const { label, variant, appearance } = map[status];
  return (
    <Badge variant={variant} appearance={appearance} size="sm">
      {label}
    </Badge>
  );
}
