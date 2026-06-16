export const PROTECTED_FOLDER_NAMES = ['Root', 'root', 'ROOT'] as const;

export const FILE_TYPE_LABELS = {
  FILE: 'File',
  FOLDER: 'Folder',
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;

export const SORT_OPTIONS = ['createdAt', 'name', 'size', 'updatedAt'] as const;
export type SortField = (typeof SORT_OPTIONS)[number];

export function isSortField(value: string | null): value is SortField {
  return SORT_OPTIONS.includes(value as SortField);
}

export const TYPE_TABS = [
  { value: 'FILE', label: 'Files' },
  { value: 'FOLDER', label: 'Folders' },
] as const;
export type TypeFilter = (typeof TYPE_TABS)[number]['value'];

export const DATE_PRESETS = [
  {
    label: 'Today',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: start, to: now };
    },
  },
  {
    label: 'Last 7 days',
    getValue: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    },
  },
  {
    label: 'This month',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start, to: now };
    },
  },
] as const;

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return '-';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, index);

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
