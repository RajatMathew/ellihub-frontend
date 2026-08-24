import { DetailTable } from '@/app/components/detail-table';
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

interface RFQVendorDesktopTableProps {
  rows: RFQVendorRowModel[];
  isTerminal: boolean;
  actionContext: RFQVendorActionContext;
}

export function RFQVendorDesktopTable({
  rows,
  isTerminal,
  actionContext,
}: RFQVendorDesktopTableProps) {
  return (
    <DetailTable
      ariaLabel="Vendor quotes"
      className="hidden lg:block"
      columns={[
        { key: 'vendor', header: 'Vendor' },
        { key: 'status', header: 'Status' },
        { align: 'end', key: 'quote', header: 'Quote Amount' },
        { key: 'leadTime', header: 'Lead Time' },
        { align: 'end', key: 'actions', header: '', width: 'w-10' },
      ]}
      rows={rows}
      getRowId={(row) => row.invite.id}
      renderCell={(row, key) => {
        switch (key) {
          case 'vendor':
            return (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{row.vendorName}</div>
                  <RFQVendorEmailSentBadge sentAt={row.emailSentAt} />
                </div>
                {row.vendorEmail && (
                  <div className="text-xs text-muted-foreground">{row.vendorEmail}</div>
                )}
              </>
            );
          case 'status':
            return isTerminal ? (
              <RFQVendorStatusBadge
                declined={row.declined}
                hasQuote={row.hasQuote}
                isVendorAwarded={row.isVendorAwarded}
              />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="cursor-pointer">
                    <RFQVendorStatusBadge
                      declined={row.declined}
                      hasQuote={row.hasQuote}
                      isVendorAwarded={row.isVendorAwarded}
                      showChevron
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <RFQVendorActionItems row={row} {...actionContext} />
                </DropdownMenuContent>
              </DropdownMenu>
            );
          case 'quote':
            return (
              <span className="tabular-nums">
                {row.grandTotal != null ? formatCurrency(row.grandTotal) : '-'}
              </span>
            );
          case 'leadTime':
            return (
              <span className="block max-w-[200px] whitespace-normal break-words text-sm text-muted-foreground">
                {row.leadTime || '-'}
              </span>
            );
          default:
            return isTerminal ? null : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    mode="icon"
                    aria-label={`Actions for ${row.vendorName}`}
                    className="size-7"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <RFQVendorActionItems row={row} {...actionContext} />
                </DropdownMenuContent>
              </DropdownMenu>
            );
        }
      }}
    />
  );
}
