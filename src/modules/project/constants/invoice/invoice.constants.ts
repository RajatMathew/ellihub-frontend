export const INVOICE_FORM_SECTIONS = [
  { id: 'invoice-details', label: 'Invoice Details' },
  { id: 'financial', label: 'Financial' },
  { id: 'related-scos', label: 'Related SCOs' },
  { id: 'documents', label: 'Documents' },
] as const;

export const INVOICE_TYPE_OPTIONS = [
  { value: 'PRELIMINARY', label: 'Preliminary' },
  { value: 'FINAL', label: 'Final' },
  { value: 'REVISION', label: 'Revision' },
] as const;

export const INVOICE_CATEGORY_OPTIONS = [
  { value: 'MATERIALS', label: 'Materials' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
  { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'CHECK', label: 'Check' },
  { value: 'ACH', label: 'ACH' },
  { value: 'WIRE', label: 'Wire Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function getInvoiceStatusBadgeVariant(
  statusName: string | undefined,
): 'success' | 'warning' | 'info' | 'destructive' | 'secondary' {
  if (!statusName) return 'secondary';
  const lower = statusName.toLowerCase();
  if (lower.includes('approved') || lower.includes('paid')) return 'success';
  if (lower.includes('pending')) return 'warning';
  if (lower.includes('rejected')) return 'destructive';
  return 'secondary';
}

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning',
  APPROVED: 'bg-success',
  REJECTED: 'bg-destructive',
};
