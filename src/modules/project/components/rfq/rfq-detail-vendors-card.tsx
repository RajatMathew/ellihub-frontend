import { useMemo } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import type { RFQQuote } from '@/modules/project/schemas/rfq';
import { FileText, Plus } from 'lucide-react';

import type {
  RFQDetailVendorsCardProps,
  RFQVendorActionContext,
  RFQVendorRowModel,
} from './rfq-detail-vendor-types';
import { RFQVendorDesktopTable } from './rfq-vendor-desktop-table';
import { RFQVendorMobileCard } from './rfq-vendor-mobile-card';

export function RFQDetailVendorsCard({
  invites,
  quotes,
  purchaseOrders,
  awardedVendorId,
  isTerminal,
  isPublished,
  isEvaluation,
  isAwarded,
  canManageVendors,
  canManageQuotes,
  canAwardQuotes,
  canUnawardQuotes,
  canCreatePurchaseOrder,
  canEmailVendors,
  onInviteVendor,
  onOpenQuote,
  onGenerateVendorPdf,
  onEmailVendor,
  onEmailAwardVendor,
  onAwardQuote,
  onUnaward,
  onGeneratePO,
  onRemoveQuote,
  onRemoveVendor,
  onDeclineInvite,
  isGeneratingVendorPdf,
}: RFQDetailVendorsCardProps) {
  const rows = useMemo<RFQVendorRowModel[]>(() => {
    const quoteByVendor = new Map<string, RFQQuote>();
    for (const quote of quotes) {
      if (quote.vendor?.id) quoteByVendor.set(quote.vendor.id, quote);
    }

    return invites.map((invite) => {
      const vendor = invite.vendor;
      const vendorId = vendor?.id;
      const quote = vendorId ? quoteByVendor.get(vendorId) : undefined;
      const purchaseOrder = purchaseOrders?.find((po) => po.vendorId === vendorId);

      return {
        invite,
        vendorId,
        vendorName: vendor?.name ?? '-',
        vendorEmail: vendor?.email,
        declined: !!invite.declinedToQuote,
        hasQuote: !!invite.hasSubmittedQuote,
        quote,
        grandTotal: quote?.grandTotal,
        isVendorAwarded: !!quote?.isAwarded || awardedVendorId === vendorId,
        purchaseOrder,
        leadTime: quote?.leadTime || quote?.notes,
        emailSentAt: invite.sentAt,
      };
    });
  }, [awardedVendorId, invites, purchaseOrders, quotes]);

  const actionContext: RFQVendorActionContext = {
    isPublished,
    isEvaluation,
    isAwarded,
    isGeneratingVendorPdf,
    canManageVendors,
    canManageQuotes,
    canAwardQuotes,
    canUnawardQuotes,
    canCreatePurchaseOrder,
    canEmailVendors,
    onOpenQuote,
    onGenerateVendorPdf,
    onEmailVendor,
    onEmailAwardVendor,
    onAwardQuote,
    onUnaward,
    onGeneratePO,
    onRemoveQuote,
    onRemoveVendor,
    onDeclineInvite,
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="min-w-0 max-w-full break-words text-xs font-semibold uppercase tracking-normal text-muted-foreground [overflow-wrap:anywhere]">
          Vendors
        </CardTitle>
        {!isTerminal && canManageVendors && (
          <Button
            variant="outline"
            size="sm"
            className="w-full min-w-0 justify-center sm:w-auto"
            onClick={onInviteVendor}
          >
            <Plus className="size-4" />
            <span className="min-w-0 truncate">Invite Vendor</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <>
            <div className="space-y-3 lg:hidden">
              {rows.map((row) => (
                <RFQVendorMobileCard
                  key={row.invite.id}
                  row={row}
                  isTerminal={isTerminal}
                  actionContext={actionContext}
                />
              ))}
            </div>
            <RFQVendorDesktopTable
              rows={rows}
              isTerminal={isTerminal}
              actionContext={actionContext}
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No vendors invited yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
