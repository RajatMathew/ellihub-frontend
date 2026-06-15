import type { ProjectStatusEnum } from '@/modules/project/schemas/project.schema';

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatusEnum; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'COMPLETED', label: 'Completed' },
];

export const PROJECT_FORM_SECTIONS = [
  { id: 'project-info', label: 'Project Info' },
  { id: 'contract', label: 'Contract' },
] as const;
