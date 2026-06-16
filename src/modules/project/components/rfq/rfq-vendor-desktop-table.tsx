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
    <div className="hidden overflow-x-auto md:block">
      <table className="min-w-max w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-4 text-xs font-semibold tracking-normal text-muted-foreground">
              Vendor
            </th>
            <th className="pb-2 pr-4 text-xs font-semibold tracking-normal text-muted-foreground">
              Status
            </th>
            <th className="pb-2 pr-4 text-right text-xs font-semibold tracking-normal text-muted-foreground">
              Quote Amount
            </th>
            <th className="pb-2 pr-4 text-xs font-semibold tracking-normal text-muted-foreground">
              Lead Time
            </th>
            <th className="w-10 pb-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.invite.id} className="border-b last:border-0">
              <td className="py-2.5 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{row.vendorName}</div>
                  <RFQVendorEmailSentBadge sentAt={row.emailSentAt} />
                </div>
                {row.vendorEmail && (
                  <div className="text-xs text-muted-foreground">{row.vendorEmail}</div>
                )}
              </td>
              <td className="py-2.5 pr-4">
                {isTerminal ? (
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
                )}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {row.grandTotal != null ? formatCurrency(row.grandTotal) : '-'}
              </td>
              <td className="py-2.5 pr-4 text-sm text-muted-foreground max-w-[200px] break-words whitespace-normal">
                {row.leadTime || '-'}
              </td>
              <td className="py-2.5 text-right">
                {!isTerminal && (
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
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
