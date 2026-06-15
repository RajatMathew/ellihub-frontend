import { useCallback, useEffect, useRef, useState } from 'react';

import { filesApi } from '@/modules/files/api/files.api';
import type { FileExportJob, FileItem } from '@/modules/files/schemas/file.schema';
import { toast } from 'sonner';

const EXPORT_POLL_INTERVAL_MS = 1500;
const EXPORT_POLL_TIMEOUT_MS = 30 * 60 * 1000;

type ExportableFolder = Pick<FileItem, 'id' | 'name' | 'displayName'>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isRunning(job: FileExportJob | null): boolean {
  return job?.status === 'PENDING' || job?.status === 'PROCESSING';
}

export function useFolderZipExport() {
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState<ExportableFolder | null>(null);
  const [job, setJob] = useState<FileExportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const tokenRef = useRef(0);

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
    };
  }, []);

  const downloadJob = useCallback((nextJob: FileExportJob) => {
    filesApi.downloadExportJob(nextJob);
    setHasAutoDownloaded(true);
  }, []);

  const startExport = useCallback(
    async (nextFolder: ExportableFolder) => {
      if (isRunning(job)) {
        setOpen(true);
        return;
      }

      const token = tokenRef.current + 1;
      tokenRef.current = token;
      setFolder(nextFolder);
      setJob(null);
      setError(null);
      setHasAutoDownloaded(false);
      setIsStarting(true);
      setOpen(true);

      try {
        let current = await filesApi.startFolderExport(nextFolder);
        if (tokenRef.current !== token) return;

        setIsStarting(false);
        setJob(current);
        const startedAt = Date.now();

        while (current.status === 'PENDING' || current.status === 'PROCESSING') {
          if (Date.now() - startedAt > EXPORT_POLL_TIMEOUT_MS) {
            throw new Error('Folder export is taking too long. Please try again later.');
          }

          await sleep(EXPORT_POLL_INTERVAL_MS);
          if (tokenRef.current !== token) return;

          current = await filesApi.getFolderExportJob(current.id);
          if (tokenRef.current !== token) return;

          setIsStarting(false);
          setJob(current);
        }

        if (current.status === 'FAILED') {
          throw new Error(current.error || 'Folder export failed.');
        }

        if (current.status === 'EXPIRED') {
          throw new Error('Folder export expired. Please start a new export.');
        }

        if (!current.downloadUrl) {
          throw new Error('Folder export finished without a download URL.');
        }

        downloadJob(current);
        toast.success('ZIP export ready.');
      } catch (caughtError) {
        if (tokenRef.current !== token) return;

        setIsStarting(false);
        const message =
          caughtError instanceof Error ? caughtError.message : 'Failed to export folder.';
        setError(message);
        toast.error(message);
      }
    },
    [downloadJob, job]
  );

  const retry = useCallback(() => {
    if (!folder) return;
    void startExport(folder);
  }, [folder, startExport]);

  const downloadAgain = useCallback(() => {
    if (!job?.downloadUrl) return;
    filesApi.downloadExportJob(job);
  }, [job]);

  return {
    open,
    setOpen,
    folder,
    job,
    error,
    isExporting: isStarting || isRunning(job),
    hasAutoDownloaded,
    startExport,
    retry,
    downloadAgain,
  };
}
