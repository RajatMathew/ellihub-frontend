import type { PaymentTerms, POStatusName, TradeCategory } from '../schemas/po.schema';

export const PO_FORM_SECTIONS = [
  { id: 'po-details', label: 'PO Details' },
  { id: 'financial', label: 'Financial' },
  { id: 'line-items', label: 'Line Items' },
  { id: 'documents', label: 'Documents' },
] as const;

export const PAYMENT_TERMS_OPTIONS: { value: PaymentTerms; label: string }[] = [
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_45', label: 'Net 45' },
  { value: 'NET_60', label: 'Net 60' },
  { value: 'NET_90', label: 'Net 90' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
];

export const PO_STATUS_LABELS: Record<POStatusName, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

export const PO_STATUS_COLORS: Record<POStatusName, string> = {
  DRAFT: 'bg-muted-foreground',
  ISSUED: 'bg-primary',
  PARTIALLY_PAID: 'bg-warning',
  PAID: 'bg-success',
  CANCELLED: 'bg-destructive',
};

export const PO_STATUS_BADGE_VARIANTS: Record<
  POStatusName,
  'primary' | 'success' | 'info' | 'warning' | 'destructive'
> = {
  DRAFT: 'primary',
  ISSUED: 'info',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  CANCELLED: 'destructive',
};

export const TRADE_CATEGORY_LABELS: Record<TradeCategory, string> = {
  MATERIAL: 'Material',
  FABRICATION: 'Fabrication',
  INSTALLATION: 'Installation',
  LABOR: 'Labor',
  EQUIPMENT: 'Equipment',
};

export const TRADE_CATEGORY_BADGE_VARIANTS: Record<
  TradeCategory,
  'primary' | 'success' | 'info' | 'warning'
> = {
  MATERIAL: 'primary',
  FABRICATION: 'info',
  INSTALLATION: 'success',
  LABOR: 'warning',
  EQUIPMENT: 'primary',
};

export const PO_STATUS_OPTIONS: { value: POStatusName; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const TRADE_CATEGORY_OPTIONS: { value: TradeCategory; label: string }[] = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'FABRICATION', label: 'Fabrication' },
  { value: 'INSTALLATION', label: 'Installation' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'EQUIPMENT', label: 'Equipment' },
];
