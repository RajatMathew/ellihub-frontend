import type { PaymentTerms } from '@/modules/project/schemas/project-contract.schema';
import type { Division } from '@/modules/project/schemas/project.schema';

export const DIVISION_LABELS: Record<Division, string> = {
  SCA: 'SCA',
  DDC: 'DDC',
  CIVIL: 'Civil',
  INSTITUTIONAL: 'Institutional',
};

export const PROJECT_DIVISION_OPTIONS: { value: Division; label: string }[] = [
  { value: 'SCA', label: DIVISION_LABELS.SCA },
  { value: 'INSTITUTIONAL', label: DIVISION_LABELS.INSTITUTIONAL },
  { value: 'DDC', label: DIVISION_LABELS.DDC },
  { value: 'CIVIL', label: DIVISION_LABELS.CIVIL },
];

export const PROJECT_LIST_SORT_FIELDS = [
  'tcoDate',
  'name',
  'jobNumber',
  'estimatedStartDate',
  'estimatedEndDate',
  'createdAt',
  'updatedAt',
] as const;

export type ProjectListSortBy = (typeof PROJECT_LIST_SORT_FIELDS)[number];
export type ProjectListSortOrder = 'asc' | 'desc';

export const PROJECT_LIST_DEFAULT_SORT_BY = 'tcoDate' satisfies ProjectListSortBy;

export const PROJECT_LIST_SORT_OPTIONS: { value: ProjectListSortBy; label: string }[] = [
  { value: 'tcoDate', label: 'TCO Date' },
  { value: 'name', label: 'Project Name' },
  { value: 'jobNumber', label: 'Job Number' },
  { value: 'estimatedStartDate', label: 'Start Date' },
  { value: 'estimatedEndDate', label: 'End Date' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
];

export const getProjectListDefaultSortOrder = (sortBy: ProjectListSortBy): ProjectListSortOrder =>
  sortBy === 'name' || sortBy === 'jobNumber' ? 'asc' : 'desc';

export const PAYMENT_TERMS_OPTIONS: { value: PaymentTerms; label: string }[] = [
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_45', label: 'Net 45' },
  { value: 'NET_60', label: 'Net 60' },
  { value: 'NET_90', label: 'Net 90' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
];
