import { useCallback, useEffect, useRef, useState } from 'react';

import { filesApi } from '@/modules/files/api/files.api';
import {
  getFolderExportProgress,
  getFolderFromExportJob,
  isFolderExportRunning,
  type ExportableFolder,
} from '@/modules/files/lib/folder-export';
import type { FileExportJob } from '@/modules/files/schemas/file.schema';
import { toast } from 'sonner';

const EXPORT_POLL_INTERVAL_MS = 1500;
const EXPORT_POLL_TIMEOUT_MS = 30 * 60 * 1000;

interface UseFolderZipExportOptions {
  enabled?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getExportErrorMessage(job: FileExportJob): string | null {
  if (job.status === 'FAILED') return job.error || 'Folder export failed.';
  if (job.status === 'EXPIRED') return 'Folder export expired. Please start a new export.';
  if (job.status === 'COMPLETED' && !job.downloadUrl) {
    return 'Folder export finished without a download URL.';
  }

  return null;
}

export function useFolderZipExport({ enabled = true }: UseFolderZipExportOptions = {}) {
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState<ExportableFolder | null>(null);
  const [job, setJob] = useState<FileExportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const tokenRef = useRef(0);
  const cancelledToastJobIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
    };
  }, []);

  const downloadJob = useCallback((nextJob: FileExportJob) => {
    filesApi.downloadExportJob(nextJob);
    setHasAutoDownloaded(true);
  }, []);

  const applyJobFolder = useCallback((nextJob: FileExportJob) => {
    const nextFolder = getFolderFromExportJob(nextJob);
    if (nextFolder) setFolder(nextFolder);
  }, []);

  const pollJob = useCallback(
    async (initialJob: FileExportJob, token: number, startedAt = Date.now()) => {
      let current = initialJob;
      setIsStarting(false);
      setError(null);
      setJob(current);
      applyJobFolder(current);

      while (isFolderExportRunning(current)) {
        if (Date.now() - startedAt > EXPORT_POLL_TIMEOUT_MS) {
          throw new Error('Folder export is taking too long. Please try again later.');
        }

        await sleep(EXPORT_POLL_INTERVAL_MS);
        if (tokenRef.current !== token) return;

        current = await filesApi.getFolderExportJob(current.id);
        if (tokenRef.current !== token) return;

        setIsStarting(false);
        setJob(current);
        applyJobFolder(current);
      }

      setIsStarting(false);

      if (current.status === 'CANCELLED') {
        setError(null);
        if (!cancelledToastJobIdsRef.current.has(current.id)) {
          cancelledToastJobIdsRef.current.add(current.id);
          toast.success('ZIP export cancelled.');
        }
        return;
      }

      const terminalError = getExportErrorMessage(current);
      if (terminalError) throw new Error(terminalError);

      downloadJob(current);
      toast.success('ZIP export ready.');
    },
    [applyJobFolder, downloadJob]
  );

  useEffect(() => {
    if (!enabled) return;

    const token = tokenRef.current + 1;
    tokenRef.current = token;

    void (async () => {
      try {
        const activeJob = await filesApi.getActiveFolderExportJob();
        if (tokenRef.current !== token || !activeJob) return;

        setJob(activeJob);
        setError(null);
        setHasAutoDownloaded(false);
        applyJobFolder(activeJob);
        await pollJob(activeJob, token);
      } catch (caughtError) {
        if (tokenRef.current !== token) return;

        setIsStarting(false);
        const message =
          caughtError instanceof Error ? caughtError.message : 'Failed to restore ZIP export.';
        setError(message);
      }
    })();

    return () => {
      if (tokenRef.current === token) tokenRef.current += 1;
    };
  }, [applyJobFolder, enabled, pollJob]);

  const startExport = useCallback(
    async (nextFolder: ExportableFolder) => {
      if (isFolderExportRunning(job)) {
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
        const current = await filesApi.startFolderExport(nextFolder);
        if (tokenRef.current !== token) return;

        await pollJob(current, token);
      } catch (caughtError) {
        if (tokenRef.current !== token) return;

        setIsStarting(false);
        const message =
          caughtError instanceof Error ? caughtError.message : 'Failed to export folder.';
        setError(message);
        toast.error(message);
      }
    },
    [job, pollJob]
  );

  const cancelExport = useCallback(async () => {
    const current = job;
    if (!current || !isFolderExportRunning(current)) return;

    setIsCancelling(true);

    try {
      const cancelled = await filesApi.cancelFolderExportJob(current.id);
      setJob(cancelled);
      applyJobFolder(cancelled);
      setIsStarting(false);
      setError(null);

      if (cancelled.status === 'CANCELLED') {
        cancelledToastJobIdsRef.current.add(cancelled.id);
        toast.success('ZIP export cancelled.');
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Failed to cancel ZIP export.';
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  }, [applyJobFolder, job]);

  const retry = useCallback(() => {
    if (!folder) return;
    void startExport(folder);
  }, [folder, startExport]);

  const downloadAgain = useCallback(() => {
    if (!job?.downloadUrl) return;
    filesApi.downloadExportJob(job);
  }, [job]);

  const reopen = useCallback(() => {
    setOpen(true);
  }, []);

  return {
    open,
    setOpen,
    reopen,
    folder,
    job,
    error,
    progress: getFolderExportProgress(job),
    isExporting: isStarting || isCancelling || isFolderExportRunning(job),
    isCancelling,
    hasAutoDownloaded,
    startExport,
    cancelExport,
    retry,
    downloadAgain,
  };
}
