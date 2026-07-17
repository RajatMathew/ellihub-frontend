import type { ProjectStatusEnum } from '@/modules/project/schemas/project.schema';

export const PROJECT_STATUS_ORDER = [
  'ACTIVE',
  'INACTIVE',
  'CLOSED',
  'COMPLETED',
] as const satisfies readonly ProjectStatusEnum[];

export const PROJECT_STATUS_LABELS: Record<ProjectStatusEnum, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  CLOSED: 'Closed',
  COMPLETED: 'Completed',
};

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatusEnum; label: string }[] =
  PROJECT_STATUS_ORDER.map((value) => ({ value, label: PROJECT_STATUS_LABELS[value] }));

const PROJECT_STATUS_SET = new Set<ProjectStatusEnum>(PROJECT_STATUS_ORDER);

export function normalizeProjectStatus(value: unknown): ProjectStatusEnum | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');

  return PROJECT_STATUS_SET.has(normalized as ProjectStatusEnum)
    ? (normalized as ProjectStatusEnum)
    : undefined;
}

export function getProjectStatusOrDefault(
  value: unknown,
  fallback: ProjectStatusEnum = 'ACTIVE'
): ProjectStatusEnum {
  return normalizeProjectStatus(value) ?? fallback;
}

export const PROJECT_FORM_SECTIONS = [
  { id: 'project-info', label: 'Project Info' },
  { id: 'contract', label: 'Contract' },
] as const;