import type { ProjectScheduleEntry } from '@/modules/project/schemas/project-schedule.schema';

export interface ScheduleTrackerDraft {
  date: string;
  description: string;
  adjustedFinishDate: string;
  notes: string;
  fileId: string;
  fileName: string;
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
});

const toDateInputValue = (value: string | null | undefined): string => {
  const dateMatch = value?.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateMatch?.[1] ?? '';
};

export function createScheduleTrackerDraftFromEntry(
  entry: ProjectScheduleEntry,
): ScheduleTrackerDraft {
  return {
    date: toDateInputValue(entry.date),
    description: entry.description ?? '',
    adjustedFinishDate: toDateInputValue(entry.adjustedFinishDate),
    notes: entry.notes ?? '',
    fileId: entry.fileId ?? '',
    fileName: entry.file?.name ?? '',
  };
}
