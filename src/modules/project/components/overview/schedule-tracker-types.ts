import type {
  ProjectScheduleEntry,
  SchedulePrimeChangeOrder,
} from '@/modules/project/schemas/project-schedule.schema';

export interface ScheduleTrackerDraft {
  date: string;
  description: string;
  adjustedFinishDate: string;
  notes: string;
  fileId: string;
  fileName: string;
  primeChangeOrderId: string;
  primeChangeOrderLabel: string;
}

export interface ScheduleTrackerPrimeChangeOrderOption {
  value: string;
  label: string;
}

export type ScheduleTrackerUploadTarget = 'add' | 'edit' | null;

export interface ScheduleTrackerEditingEntry {
  id: string;
  draft: ScheduleTrackerDraft;
}

export const createEmptyScheduleTrackerDraft = (): ScheduleTrackerDraft => ({
  date: '',
  description: '',
  adjustedFinishDate: '',
  notes: '',
  fileId: '',
  fileName: '',
  primeChangeOrderId: '',
  primeChangeOrderLabel: '',
});

const toDateInputValue = (value: string | null | undefined): string => {
  const dateMatch = value?.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateMatch?.[1] ?? '';
};

export function formatSchedulePrimeChangeOrderLabel(
  primeChangeOrder: Pick<
    SchedulePrimeChangeOrder,
    'referenceNumber' | 'name' | 'deletedAt' | 'fieldwireDeletedAt'
  >
): string {
  const baseLabel = [primeChangeOrder.referenceNumber, primeChangeOrder.name]
    .filter(Boolean)
    .join(' - ');
  const label = baseLabel || 'Prime Change Order';

  return primeChangeOrder.deletedAt || primeChangeOrder.fieldwireDeletedAt
    ? `${label} (deleted)`
    : label;
}

export function createScheduleTrackerDraftFromEntry(
  entry: ProjectScheduleEntry
): ScheduleTrackerDraft {
  return {
    date: toDateInputValue(entry.date),
    description: entry.description ?? '',
    adjustedFinishDate: toDateInputValue(entry.adjustedFinishDate),
    notes: entry.notes ?? '',
    fileId: entry.fileId ?? '',
    fileName: entry.file?.name ?? '',
    primeChangeOrderId: entry.primeChangeOrderId ?? '',
    primeChangeOrderLabel: entry.primeChangeOrder
      ? formatSchedulePrimeChangeOrderLabel(entry.primeChangeOrder)
      : '',
  };
}
