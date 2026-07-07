import type { FileExportJob, FileItem } from '@/modules/files/schemas/file.schema';

export type ExportableFolder = Pick<FileItem, 'id' | 'name' | 'displayName'>;

export function isFolderExportRunning(job: FileExportJob | null): boolean {
  return job?.status === 'PENDING' || job?.status === 'PROCESSING';
}

export function isFolderExportFailed(job: FileExportJob | null, error: string | null): boolean {
  return !!error || job?.status === 'FAILED' || job?.status === 'EXPIRED';
}

export function isFolderExportCancelled(job: FileExportJob | null): boolean {
  return job?.status === 'CANCELLED';
}

export function getFolderFromExportJob(job: FileExportJob | null): ExportableFolder | null {
  if (!job?.folder) return null;

  return {
    id: job.folder.id,
    name: job.folder.name,
    displayName: job.folder.displayName ?? null,
  };
}

export function getFolderExportProgress(job: FileExportJob | null): number {
  if (!job) return 0;
  if (job.status === 'COMPLETED') return 100;
  if (job.status === 'FAILED' || job.status === 'EXPIRED') return 100;

  if (job.totalFiles > 0) {
    const progress = Math.round((job.processedFiles / job.totalFiles) * 100);
    return job.status === 'CANCELLED' ? Math.min(100, progress) : Math.min(99, progress);
  }

  if (job.status === 'PROCESSING') return 12;
  if (job.status === 'PENDING') return 4;

  return 0;
}

export function getFolderExportStatusLabel(
  job: FileExportJob | null,
  error: string | null,
  isCancelling = false
): string {
  if (isCancelling) return 'Cancelling';
  if (error) return 'Failed';
  if (!job) return 'Starting';
  if (job.status === 'PENDING') return 'Queued';
  if (job.status === 'PROCESSING') return 'Exporting';
  if (job.status === 'COMPLETED') return 'Ready';
  if (job.status === 'EXPIRED') return 'Expired';
  if (job.status === 'CANCELLED') return 'Cancelled';
  return 'Failed';
}
