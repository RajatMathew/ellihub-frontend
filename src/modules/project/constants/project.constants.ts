import type { Division } from '../schemas/project.schema';
import type { PaymentTerms } from '../schemas/project-contract.schema';

export const STAGE_COLOR_MAP: Record<string, string> = {
  green: 'success',
  blue: 'info',
  red: 'destructive',
  yellow: 'warning',
  orange: 'warning',
  purple: 'info',
  gray: 'secondary',
  grey: 'secondary',
};

export const DIVISION_OPTIONS: { value: Division; label: string }[] = [
  { value: 'SCA', label: 'SCA' },
  { value: 'DDC', label: 'DDC' },
  { value: 'CIVIL', label: 'Civil' },
  { value: 'INSTITUTIONAL', label: 'Institutional' },
];

export const DIVISION_LABELS: Record<Division, string> = {
  SCA: 'SCA',
  DDC: 'DDC',
  CIVIL: 'Civil',
  INSTITUTIONAL: 'Institutional',
};

export const PAYMENT_TERMS_OPTIONS: { value: PaymentTerms; label: string }[] = [
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_45', label: 'Net 45' },
  { value: 'NET_60', label: 'Net 60' },
  { value: 'NET_90', label: 'Net 90' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
];

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  NET_15: 'Net 15',
  NET_30: 'Net 30',
  NET_45: 'Net 45',
  NET_60: 'Net 60',
  NET_90: 'Net 90',
  DUE_ON_RECEIPT: 'Due on Receipt',
};

export const PROJECT_FORM_SECTIONS = [
  { id: 'info', label: 'Info' },
  { id: 'contract', label: 'Contract' },
  { id: 'team', label: 'Team' },
  { id: 'schedule', label: 'Schedule' },
] as const;
