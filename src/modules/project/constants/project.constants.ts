import type { PaymentTerms } from '@/modules/project/schemas/project-contract.schema';
import type { Division } from '@/modules/project/schemas/project.schema';

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
