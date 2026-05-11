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

export function createScheduleTrackerDraftFromEntry(
  entry: ProjectScheduleEntry,
): ScheduleTrackerDraft {
  return {
    date: entry.date ?? '',
    description: entry.description ?? '',
    adjustedFinishDate: entry.adjustedFinishDate ?? '',
    notes: entry.notes ?? '',
    fileId: entry.fileId ?? '',
    fileName: entry.file?.name ?? '',
  };
}
