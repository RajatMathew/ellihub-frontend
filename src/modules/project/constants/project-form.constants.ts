import type { Division } from '@modules/project/schemas/project.schema';

export const PROJECT_FORM_SECTIONS = [
  { id: 'project-info', label: 'Project Info' },
  { id: 'contract', label: 'Contract' },
] as const;

export const DIVISION_OPTIONS: { value: Division; label: string }[] = [
  { value: 'SCA', label: 'SCA - Standard' },
  { value: 'DDC', label: 'DDC' },
  { value: 'CIVIL', label: 'Civil' },
  { value: 'INSTITUTIONAL', label: 'Institutional' },
];
