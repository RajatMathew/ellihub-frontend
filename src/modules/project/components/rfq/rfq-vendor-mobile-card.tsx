import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { formatCurrency } from '@/app/lib/helpers';
import { MoreHorizontal } from 'lucide-react';

import type { RFQVendorActionContext, RFQVendorRowModel } from './rfq-detail-vendor-types';
import { RFQVendorActionItems } from './rfq-vendor-action-items';
import { RFQVendorEmailSentBadge } from './rfq-vendor-email-sent-badge';
import { RFQVendorStatusBadge } from './rfq-vendor-status-badge';

interface RFQVendorMobileCardProps {
  row: RFQVendorRowModel;
  isTerminal: boolean;
  actionContext: RFQVendorActionContext;
}

export function RFQVendorMobileCard({ row, isTerminal, actionContext }: RFQVendorMobileCardProps) {
  return (
    <div className="min-w-0 max-w-full rounded-lg border p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="min-w-0 break-words text-sm font-semibold [overflow-wrap:anywhere]">
              {row.vendorName}
            </div>
            <RFQVendorEmailSentBadge sentAt={row.emailSentAt} />
          </div>
          {row.vendorEmail && (
            <div className="mt-1 break-all text-xs text-muted-foreground">{row.vendorEmail}</div>
          )}
        </div>
        {!isTerminal && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                mode="icon"
                aria-label={`Actions for ${row.vendorName}`}
                className="size-8 shrink-0"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <RFQVendorActionItems row={row} {...actionContext} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
        <RFQVendorStatusBadge
          declined={row.declined}
          hasQuote={row.hasQuote}
          isVendorAwarded={row.isVendorAwarded}
        />
        {row.grandTotal != null && (
          <span className="min-w-0 break-words text-sm font-medium tabular-nums [overflow-wrap:anywhere]">
            {formatCurrency(row.grandTotal)}
          </span>
        )}
        <span className="min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          Lead time: {row.leadTime || '-'}
        </span>
      </div>
    </div>
  );
}
