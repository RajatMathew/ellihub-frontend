import type { StatusTone } from '@/app/components/status-tone';

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

/**
 * The one project status the shared vocabulary gets wrong.
 *
 * A completed *project* is a finished job rather than a good outcome, so it
 * takes the brand tone the way an issued document does, not the green that
 * `COMPLETED` earns on a task or a payment. Everything else (`ACTIVE`,
 * `INACTIVE`, `CLOSED`) resolves from the shared map.
 */
export const PROJECT_STATUS_TONES: Record<string, StatusTone> = {
  COMPLETED: 'active',
};
