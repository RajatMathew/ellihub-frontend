import { DropdownMenuItem, DropdownMenuSeparator } from '@/app/components/ui/dropdown-menu';
import { Eye, FileDown, FileText, Mail, Pencil, Trash2, Trophy, Upload, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { RFQVendorActionContext, RFQVendorRowModel } from './rfq-detail-vendor-types';

interface RFQVendorActionItemsProps extends RFQVendorActionContext {
  row: RFQVendorRowModel;
}

export function RFQVendorActionItems({
  row,
  isPublished,
  isEvaluation,
  isAwarded,
  isGeneratingVendorPdf,
  onOpenQuote,
  onGenerateVendorPdf,
  onEmailVendor,
  onAwardQuote,
  onUnaward,
  onGeneratePO,
  onRemoveQuote,
  onRemoveVendor,
  onDeclineInvite,
}: RFQVendorActionItemsProps) {
  const {
    invite,
    vendorId,
    quote,
    hasQuote,
    declined,
    grandTotal,
    isVendorAwarded,
    purchaseOrder,
  } = row;
  const canAward =
    !isVendorAwarded &&
    hasQuote &&
    quote &&
    grandTotal != null &&
    grandTotal > 0 &&
    (isPublished || isEvaluation || isAwarded);

  return (
    <>
      {hasQuote && quote && vendorId && (
        <DropdownMenuItem onClick={() => onOpenQuote(invite.id, vendorId, quote.id, true)}>
          <Eye className="size-4" />
          View Quote
        </DropdownMenuItem>
      )}
      {!isVendorAwarded && !hasQuote && !declined && vendorId && (
        <DropdownMenuItem onClick={() => onOpenQuote(invite.id, vendorId)}>
          <Upload className="size-4" />
          Upload Quote
        </DropdownMenuItem>
      )}
      {!isVendorAwarded && hasQuote && quote && vendorId && (
        <DropdownMenuItem onClick={() => onOpenQuote(invite.id, vendorId, quote.id)}>
          <Pencil className="size-4" />
          Edit Quote
        </DropdownMenuItem>
      )}
      {canAward && quote && (
        <DropdownMenuItem onClick={() => onAwardQuote(quote.id)}>
          <Trophy className="size-4" />
          Award
        </DropdownMenuItem>
      )}
      {isVendorAwarded && (
        <DropdownMenuItem onClick={onGeneratePO}>
          <FileText className="size-4" />
          Create PO
        </DropdownMenuItem>
      )}
      {isVendorAwarded && purchaseOrder && (
        <DropdownMenuItem asChild>
          <Link to={`../../purchase-orders/${purchaseOrder.id}`}>
            <FileText className="size-4" />
            View PO
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        disabled={isGeneratingVendorPdf}
        onClick={() => onGenerateVendorPdf(invite.id, row.vendorName)}
      >
        <FileDown className="size-4" />
        {isGeneratingVendorPdf ? 'Generating PDF...' : 'Generate PDF'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onEmailVendor(invite.id)}>
        <Mail className="size-4" />
        Email
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {hasQuote && quote && !isVendorAwarded && (
        <DropdownMenuItem variant="destructive" onClick={() => onRemoveQuote(quote.id)}>
          <Trash2 className="size-4" />
          Remove Quote
        </DropdownMenuItem>
      )}
      {isVendorAwarded && (
        <DropdownMenuItem variant="destructive" onClick={onUnaward}>
          <XCircle className="size-4" />
          Unaward
        </DropdownMenuItem>
      )}
      {!isVendorAwarded && (
        <DropdownMenuItem variant="destructive" onClick={() => onRemoveVendor(invite.id)}>
          <Trash2 className="size-4" />
          Remove Vendor
        </DropdownMenuItem>
      )}
      {!declined && !isVendorAwarded && (
        <DropdownMenuItem variant="destructive" onClick={() => onDeclineInvite(invite.id)}>
          <XCircle className="size-4" />
          Decline
        </DropdownMenuItem>
      )}
    </>
  );
}
