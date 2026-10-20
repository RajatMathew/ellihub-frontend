import { sumRoundedLineAmountsDecimal } from '@/modules/project/lib/commercial-decimal';
import type { CreateInvoiceInput } from '@/modules/project/schemas/invoice';
import type { CreatePOInput } from '@/modules/project/schemas/purchase-order/purchase-order.schema';
import type { CreateRFQInput } from '@/modules/project/schemas/rfq/rfq.schema';
import type { CreateSCOInput } from '@/modules/project/schemas/sub-change-order/sub-change-order.schema';

/**
 * Elliot's record proposals — `proposeRecordAction` in elli-core's assistant
 * module, which owns the schema these types mirror. Elliot proposes; the card
 * shows it; the user approves; this side calls the same create routes the RFQ,
 * PO, SCO and invoice pages call.
 *
 * Everything here is pure so the rules that decide what reaches the API are
 * testable without rendering the panel.
 */

/**
 * A file for the record. Elliot only ever proposes one from mail; a file the
 * user picks on the card stays in the browser until approval, because a new
 * PO, SCO or RFQ has no folder to upload into until it exists.
 */
export type RecordAttachment =
  | {
      source: 'email_attachment';
      accountId?: string;
      messageId: string;
      attachmentId: string;
      attachmentName: string;
    }
  | { source: 'local_file'; file: File; fileName: string };

type Summary = { summary: string };

export type CreateRfqRecordAction = Summary & {
  action: 'create_rfq';
  projectId: string;
  projectName: string;
  title: string;
  description?: string | null;
  rfqDate: string;
  typeId: string;
  typeLabel: string;
  deliverables: Array<{
    name: string;
    quantity: number;
    unitId: string;
    unitLabel: string;
    costCodeId?: string | null;
    costCodeLabel?: string | null;
  }>;
  attachments?: RecordAttachment[];
};

export type AwardRfqRecordAction = Summary & {
  action: 'award_rfq';
  rfqId: string;
  rfqNumber: string;
  quoteId: string;
  vendorName: string;
  quotedAmount?: number | null;
  negotiationAmount?: number | null;
};

export type CreatePoRecordAction = Summary & {
  action: 'create_po';
  projectId: string;
  projectName: string;
  vendorId: string;
  vendorName: string;
  rfqId?: string | null;
  rfqNumber?: string | null;
  tradeCategoryId: string;
  tradeCategoryLabel: string;
  paymentTerms: CreatePOInput['paymentTerms'];
  leadTime?: string | null;
  expectedDate?: string | null;
  lineItems: Array<{
    rfqDeliverableId?: string | null;
    description: string;
    quantity: number;
    unitId: string;
    unitLabel: string;
    unitPrice: number;
    costCodeId: string;
    costCodeLabel: string;
  }>;
  issue?: boolean;
  attachment?: RecordAttachment | null;
};

export type CreateScoRecordAction = Summary & {
  action: 'create_sco';
  projectId: string;
  projectName?: string | null;
  purchaseOrderId: string;
  poNumber: string;
  vendorName: string;
  date: string;
  title: string;
  description?: string | null;
  changeTypeId: string;
  changeTypeLabel: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitId: string;
    unitLabel: string;
    unitPrice: number;
    costCodeId?: string | null;
    costCodeLabel?: string | null;
  }>;
  attachment?: RecordAttachment | null;
};

export type LogInvoiceRecordAction = Summary & {
  action: 'log_invoice';
  projectId: string;
  projectName?: string | null;
  vendorId: string;
  vendorName: string;
  purchaseOrderId: string;
  poNumber: string;
  externalInvoiceNumber?: string | null;
  invoiceDate: string;
  dueDate: string;
  totalAmount?: number | null;
  taxAmount?: number | null;
  notes?: string | null;
  attachment?: RecordAttachment | null;
};

export type RecordAgentAction =
  | CreateRfqRecordAction
  | AwardRfqRecordAction
  | CreatePoRecordAction
  | CreateScoRecordAction
  | LogInvoiceRecordAction;

export const RECORD_TOOL_NAME = 'proposeRecordAction';

/**
 * Tool input streams in a piece at a time; a card can only render once the
 * fields its variant reads are there.
 */
export function isRecordActionReady(
  action: Partial<RecordAgentAction> | undefined
): action is RecordAgentAction {
  if (!action?.action || !action.summary) return false;
  switch (action.action) {
    case 'create_rfq':
      return !!action.projectId && !!action.title && Array.isArray(action.deliverables);
    case 'award_rfq':
      return !!action.rfqId && !!action.quoteId;
    case 'create_po':
    case 'create_sco':
      return !!action.projectId && Array.isArray(action.lineItems);
    case 'log_invoice':
      return !!action.purchaseOrderId && !!action.vendorId;
    default:
      return false;
  }
}

/** Why the card cannot submit yet, or null when it can. */
export function recordActionBlocker(action: RecordAgentAction): string | null {
  switch (action.action) {
    case 'create_rfq':
      if (action.deliverables.length === 0) return 'Add at least one deliverable.';
      if (!action.title.trim()) return 'Give the RFQ a title.';
      if (!action.rfqDate) return 'Pick an RFQ date.';
      if (action.deliverables.some((deliverable) => !deliverable.name.trim())) {
        return 'Every deliverable needs a name.';
      }
      return action.deliverables.some((deliverable) => !(deliverable.quantity > 0))
        ? 'Every deliverable needs a quantity above 0.'
        : null;
    case 'award_rfq':
      // Blank means no negotiated figure; a typed one has to be a real price.
      return action.negotiationAmount != null && !(action.negotiationAmount > 0)
        ? 'Enter a negotiated amount above 0, or leave it blank.'
        : null;
    case 'create_po':
    case 'create_sco':
      if (action.action === 'create_sco') {
        if (!action.title.trim()) return 'Give the change order a title.';
        if (!action.date) return 'Pick a change order date.';
      }
      if (action.lineItems.length === 0) return 'Add at least one line item.';
      if (action.lineItems.some((line) => !line.description.trim())) {
        return 'Every line needs a description.';
      }
      if (action.action === 'create_po' && action.lineItems.some((line) => !line.costCodeId)) {
        return 'Every line needs a cost code.';
      }
      return action.lineItems.some((line) => !(line.quantity > 0))
        ? 'Every line needs a quantity above 0.'
        : null;
    case 'log_invoice':
      if (!action.attachment) return 'Attach the invoice before logging it.';
      if (!action.invoiceDate) return 'Pick the invoice date.';
      if (!action.dueDate) return 'Pick the due date.';
      return (action.totalAmount ?? 0) > 0 ? null : 'Enter an invoice amount above 0.';
  }
}

/** The PO or change order subtotal, rounded the way the API rounds it. */
export function recordLineSubtotal(action: CreatePoRecordAction | CreateScoRecordAction): string {
  return sumRoundedLineAmountsDecimal(action.lineItems).toFixed(2);
}

export function recordAttachmentName(attachment: RecordAttachment): string {
  return attachment.source === 'email_attachment' ? attachment.attachmentName : attachment.fileName;
}

/** Files the record will carry once it is created. */
export function recordActionAttachments(action: RecordAgentAction): RecordAttachment[] {
  switch (action.action) {
    case 'create_rfq':
      return action.attachments ?? [];
    case 'award_rfq':
      return [];
    default:
      return action.attachment ? [action.attachment] : [];
  }
}

type RecordCopy = {
  label: string;
  submitLabel: string;
  rejectedLabel: string;
  rejectedOutput: string;
  failureFallback: string;
};

export function recordActionCopy(action: RecordAgentAction['action']): RecordCopy {
  switch (action) {
    case 'create_rfq':
      return {
        label: 'Create RFQ',
        submitLabel: 'Create RFQ',
        rejectedLabel: 'Rejected. No RFQ was created.',
        rejectedOutput: 'REJECTED: No RFQ was created.',
        failureFallback: 'Creating the RFQ failed.',
      };
    case 'award_rfq':
      return {
        label: 'Award RFQ',
        submitLabel: 'Award',
        rejectedLabel: 'Rejected. The RFQ was not awarded.',
        rejectedOutput: 'REJECTED: The RFQ was not awarded.',
        failureFallback: 'Awarding the RFQ failed.',
      };
    case 'create_po':
      return {
        label: 'Create purchase order',
        submitLabel: 'Create PO',
        rejectedLabel: 'Rejected. No purchase order was created.',
        rejectedOutput: 'REJECTED: No purchase order was created.',
        failureFallback: 'Creating the purchase order failed.',
      };
    case 'create_sco':
      return {
        label: 'Create change order',
        submitLabel: 'Create change order',
        rejectedLabel: 'Rejected. No change order was created.',
        rejectedOutput: 'REJECTED: No change order was created.',
        failureFallback: 'Creating the change order failed.',
      };
    case 'log_invoice':
      return {
        label: 'Log invoice',
        submitLabel: 'Log invoice',
        rejectedLabel: 'Rejected. No invoice was logged.',
        rejectedOutput: 'REJECTED: No invoice was logged.',
        failureFallback: 'Logging the invoice failed.',
      };
  }
}

export function toCreateRfqInput(action: CreateRfqRecordAction): CreateRFQInput {
  return {
    projectId: action.projectId,
    title: action.title,
    // The RFQ form requires a description; the title is the honest fallback.
    description: action.description?.trim() || action.title,
    typeId: action.typeId,
    rfqDate: action.rfqDate,
    deliverables: action.deliverables.map((deliverable) => ({
      name: deliverable.name,
      description: deliverable.name,
      quantity: deliverable.quantity,
      unitId: deliverable.unitId,
      costCodeId: deliverable.costCodeId ?? undefined,
    })),
  };
}

export function toCreatePoInput(action: CreatePoRecordAction): CreatePOInput {
  return {
    projectId: action.projectId,
    vendorId: action.vendorId,
    rfqId: action.rfqId ?? undefined,
    tradeCategoryId: action.tradeCategoryId,
    paymentTerms: action.paymentTerms,
    leadTime: action.leadTime ?? undefined,
    expectedDate: action.expectedDate ?? undefined,
    lineItems: action.lineItems.map((line) => ({
      rfqDeliverableId: line.rfqDeliverableId ?? undefined,
      description: line.description,
      quantity: line.quantity,
      unitId: line.unitId,
      unitPrice: line.unitPrice,
      costCodeId: line.costCodeId,
    })),
  };
}

export function toCreateScoInput(action: CreateScoRecordAction): CreateSCOInput {
  return {
    projectId: action.projectId,
    purchaseOrderId: action.purchaseOrderId,
    date: action.date,
    title: action.title,
    description: action.description ?? undefined,
    changeTypeId: action.changeTypeId,
    lineItems: action.lineItems.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitId: line.unitId,
      unitPrice: line.unitPrice,
      costCodeId: line.costCodeId ?? undefined,
    })),
  };
}

export function toCreateInvoiceInput(
  action: LogInvoiceRecordAction,
  attachmentIds: string[]
): CreateInvoiceInput {
  return {
    projectId: action.projectId,
    vendorId: action.vendorId,
    purchaseOrderId: action.purchaseOrderId,
    externalInvoiceNumber: action.externalInvoiceNumber || null,
    invoiceDate: action.invoiceDate,
    dueDate: action.dueDate,
    totalAmount: action.totalAmount ?? 0,
    taxAmount: action.taxAmount ?? 0,
    taxRate: 0,
    // What the invoice form sends when its notes box is left empty.
    notes: action.notes ?? '',
    vendorCoupon: false,
    relatedSCOIds: [],
    attachments: attachmentIds,
  };
}
