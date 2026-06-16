import { Badge } from '@/app/components/ui/badge';
import { ChevronDown } from 'lucide-react';

import type { RFQVendorRowModel } from './rfq-detail-vendor-types';

interface RFQVendorStatusBadgeProps extends Pick<
  RFQVendorRowModel,
  'declined' | 'hasQuote' | 'isVendorAwarded'
> {
  showChevron?: boolean;
}

export function RFQVendorStatusBadge({
  declined,
  hasQuote,
  isVendorAwarded,
  showChevron = false,
}: RFQVendorStatusBadgeProps) {
  if (isVendorAwarded) {
    return (
      <Badge variant="success" appearance="light" size="sm">
        Awarded {showChevron && <ChevronDown className="ml-0.5 inline size-3" />}
      </Badge>
    );
  }

  if (declined) {
    return (
      <Badge variant="destructive" appearance="light" size="sm">
        Declined {showChevron && <ChevronDown className="ml-0.5 inline size-3" />}
      </Badge>
    );
  }

  if (hasQuote) {
    return (
      <Badge variant="primary" appearance="light" size="sm">
        Quoted {showChevron && <ChevronDown className="ml-0.5 inline size-3" />}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" appearance="light" size="sm">
      Waiting {showChevron && <ChevronDown className="ml-0.5 inline size-3" />}
    </Badge>
  );
}
