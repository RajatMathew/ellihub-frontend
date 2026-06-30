import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { filesApi, type FileUploadPayload } from '@/modules/files/api/files.api';
import { filesKeys } from '@/modules/files/constants/files.keys';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';

const MAX_PARALLEL_UPLOADS = 2;

type UploadTaskStatus = 'queued' | 'uploading' | 'finalizing' | 'completed' | 'failed' | 'cancelled';
type UploadFailureStage = 'upload' | 'finalizing';

export interface UploadTask {
  id: string;
  fileName: string;
  displayName: string;
  parentId: string;
  fileSize: number;
  uploadedBytes: number;
  totalBytes: number;
  progress: number;
  status: UploadTaskStatus;
  label?: string;
  error?: string;
  failureStage?: UploadFailureStage;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface UploadTaskOptions {
  label?: string;
  onUploaded?: (file: FileItem, payload: FileUploadPayload) => Promise<void> | void;
  onFailed?: (error: unknown, payload: FileUploadPayload) => Promise<void> | void;
  onCancelled?: (payload: FileUploadPayload) => Promise<void> | void;
}

interface UploadCompletion {
  promise: Promise<FileItem>;
  resolve: (file: FileItem) => void;
  reject: (error: unknown) => void;
}

interface UploadEntry {
  payload: FileUploadPayload;
  options: UploadTaskOptions;
  uploadedFile?: FileItem;
  completion?: UploadCompletion;
}

interface UploadState {
  tasks: UploadTask[];
  open: boolean;
  collapsed: boolean;
}

type UploadAction =
  | { type: 'enqueue'; tasks: UploadTask[] }
  | { type: 'update'; id: string; patch: Partial<UploadTask> }
  | { type: 'remove'; id: string }
  | { type: 'clear-terminal' }
  | { type: 'set-open'; open: boolean }
  | { type: 'set-collapsed'; collapsed: boolean };

interface UploadManagerValue {
  tasks: UploadTask[];
  open: boolean;
  collapsed: boolean;
  enqueueUpload: (payload: FileUploadPayload, options?: UploadTaskOptions) => string;
  enqueueUploads: (payloads: FileUploadPayload[], options?: UploadTaskOptions) => string[];
  enqueueUploadsAndWait: (
    payloads: FileUploadPayload[],
    options?: UploadTaskOptions
  ) => Promise<FileItem[]>;
  cancelUpload: (id: string) => void;
  cancelAll: () => void;
  retryUpload: (id: string) => void;
  clearUpload: (id: string) => void;
  clearTerminalUploads: () => void;
  setOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
}

const UploadManagerContext = createContext<UploadManagerValue | null>(null);

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'enqueue':
      return {
        ...state,
        tasks: [...action.tasks, ...state.tasks],
        open: true,
        collapsed: false,
      };
    case 'update':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, ...action.patch } : task
        ),
      };
    case 'remove':
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) };
    case 'clear-terminal':
      return {
        ...state,
        tasks: state.tasks.filter(
          (task) =>
            task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled'
        ),
      };
    case 'set-open':
      return { ...state, open: action.open };
    case 'set-collapsed':
      return { ...state, collapsed: action.collapsed };
    default:
      return state;
  }
}

function createUploadId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createUploadCompletion(): UploadCompletion {
  let resolve!: (file: FileItem) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<FileItem>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

function getUploadDisplayName(payload: FileUploadPayload): string {
  return payload.data.name || payload.file.name;
}

function createTask(payload: FileUploadPayload, options: UploadTaskOptions): UploadTask {
  return {
    id: createUploadId(),
    fileName: payload.file.name,
    displayName: getUploadDisplayName(payload),
    parentId: payload.data.parentId,
    fileSize: payload.file.size,
    uploadedBytes: 0,
    totalBytes: payload.file.size,
    progress: 0,
    status: 'queued',
    label: options.label,
    createdAt: Date.now(),
  };
}

function isUploadCancellation(error: unknown): boolean {
  if (isAxiosError(error)) return error.code === 'ERR_CANCELED';
  if (error instanceof DOMException) return error.name === 'AbortError';
  return error instanceof Error && error.name === 'CanceledError';
}

function getRunningTaskCount(tasks: UploadTask[]): number {
  return tasks.filter((task) => task.status === 'uploading' || task.status === 'finalizing').length;
}

export function UploadManagerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(uploadReducer, {
    tasks: [],
    open: false,
    collapsed: false,
  });
  const tasksRef = useRef<UploadTask[]>(state.tasks);
  const entriesRef = useRef<Map<string, UploadEntry>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const activeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    tasksRef.current = state.tasks;
  }, [state.tasks]);

  const invalidateUploadQueries = useCallback(
    async (parentId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: filesKeys.all }),
        queryClient.invalidateQueries({ queryKey: filesKeys.folderDetail(parentId) }),
      ]);
    },
    [queryClient]
  );

  const runUpload = useCallback(
    async (id: string) => {
      if (activeIdsRef.current.has(id)) return;

      const entry = entriesRef.current.get(id);
      if (!entry) return;

      activeIdsRef.current.add(id);
      let controller: AbortController | null = null;
      let uploadedFile = entry.uploadedFile;
      let hasUploaded = !!uploadedFile;

      dispatch({
        type: 'update',
        id,
        patch: {
          status: uploadedFile ? 'finalizing' : 'uploading',
          uploadedBytes: uploadedFile ? entry.payload.file.size : 0,
          totalBytes: entry.payload.file.size,
          progress: uploadedFile ? 100 : 0,
          error: undefined,
          failureStage: undefined,
          startedAt: Date.now(),
          completedAt: undefined,
        },
      });

      try {
        if (!uploadedFile) {
          controller = new AbortController();
          controllersRef.current.set(id, controller);

          uploadedFile = await filesApi.uploadFile(entry.payload.file, entry.payload.data, {
            signal: controller.signal,
            onUploadProgress: (event) => {
              const total = event.total ?? entry.payload.file.size;
              const loaded = Math.min(event.loaded, total || event.loaded);
              const progress = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

              dispatch({
                type: 'update',
                id,
                patch: {
                  uploadedBytes: loaded,
                  totalBytes: total || entry.payload.file.size,
                  progress,
                  status: progress >= 100 ? 'finalizing' : 'uploading',
                },
              });
            },
          });

          entry.uploadedFile = uploadedFile;
          hasUploaded = true;
          await invalidateUploadQueries(entry.payload.data.parentId);
        }

        dispatch({ type: 'update', id, patch: { status: 'finalizing', progress: 100 } });

        await entry.options.onUploaded?.(uploadedFile, entry.payload);

        dispatch({
          type: 'update',
          id,
          patch: {
            status: 'completed',
            uploadedBytes: entry.payload.file.size,
            totalBytes: entry.payload.file.size,
            progress: 100,
            completedAt: Date.now(),
          },
        });
        entry.completion?.resolve(uploadedFile);
        toast.success(`${entry.payload.file.name} uploaded.`);
      } catch (error) {
        if (controller?.signal.aborted || isUploadCancellation(error)) {
          dispatch({
            type: 'update',
            id,
            patch: {
              status: 'cancelled',
              error: undefined,
              completedAt: Date.now(),
            },
          });
          try {
            await entry.options.onCancelled?.(entry.payload);
          } catch (callbackError) {
            console.error('[UploadManager] onCancelled callback failed:', callbackError);
          }
          entry.completion?.reject(error);
          return;
        }

        const message = getApiErrorMessage(error, `Failed to upload ${entry.payload.file.name}.`);
        dispatch({
          type: 'update',
          id,
          patch: {
            status: 'failed',
            error: message,
            failureStage: hasUploaded ? 'finalizing' : 'upload',
            completedAt: Date.now(),
          },
        });
        try {
          await entry.options.onFailed?.(error, entry.payload);
        } catch (callbackError) {
          console.error('[UploadManager] onFailed callback failed:', callbackError);
        }
        entry.completion?.reject(error);
        toast.error(message);
      } finally {
        activeIdsRef.current.delete(id);
        if (controller) controllersRef.current.delete(id);
      }
    },
    [invalidateUploadQueries]
  );

  useEffect(() => {
    const runningCount = getRunningTaskCount(state.tasks);
    const availableSlots = Math.max(0, MAX_PARALLEL_UPLOADS - runningCount);
    if (availableSlots === 0) return;

    const nextTasks = state.tasks
      .filter((task) => task.status === 'queued' && !activeIdsRef.current.has(task.id))
      .slice(0, availableSlots);

    for (const task of nextTasks) {
      void runUpload(task.id);
    }
  }, [runUpload, state.tasks]);

  const enqueueUploadsInternal = useCallback(
    (
      payloads: FileUploadPayload[],
      options: UploadTaskOptions = {},
      waitForCompletion = false
    ) => {
      if (payloads.length === 0) return { ids: [], completions: [] as Promise<FileItem>[] };

      const tasks = payloads.map((payload) => createTask(payload, options));
      const completions: Promise<FileItem>[] = [];
      for (const [index, task] of tasks.entries()) {
        const payload = payloads[index];
        const completion = waitForCompletion ? createUploadCompletion() : undefined;
        if (completion) completions.push(completion.promise);
        if (payload) entriesRef.current.set(task.id, { payload, options, completion });
      }

      dispatch({ type: 'enqueue', tasks });

      toast.info(
        payloads.length === 1
          ? `Uploading ${payloads[0].file.name}.`
          : `Uploading ${payloads.length} files.`
      );

      return { ids: tasks.map((task) => task.id), completions };
    },
    []
  );

  const enqueueUploads = useCallback(
    (payloads: FileUploadPayload[], options: UploadTaskOptions = {}) =>
      enqueueUploadsInternal(payloads, options).ids,
    [enqueueUploadsInternal]
  );

  const enqueueUpload = useCallback(
    (payload: FileUploadPayload, options: UploadTaskOptions = {}) =>
      enqueueUploads([payload], options)[0] ?? '',
    [enqueueUploads]
  );

  const enqueueUploadsAndWait = useCallback(
    (payloads: FileUploadPayload[], options: UploadTaskOptions = {}) =>
      Promise.all(enqueueUploadsInternal(payloads, options, true).completions),
    [enqueueUploadsInternal]
  );

  const cancelUpload = useCallback((id: string) => {
    const task = tasksRef.current.find((item) => item.id === id);
    if (!task) return;

    if (task.status === 'queued') {
      dispatch({
        type: 'update',
        id,
        patch: { status: 'cancelled', completedAt: Date.now() },
      });
      const entry = entriesRef.current.get(id);
      if (entry) {
        void entry.options.onCancelled?.(entry.payload);
        entry.completion?.reject(new DOMException('Upload cancelled', 'AbortError'));
      }
      return;
    }

    controllersRef.current.get(id)?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    for (const task of tasksRef.current) {
      if (task.status === 'queued' || task.status === 'uploading') cancelUpload(task.id);
    }
  }, [cancelUpload]);

  const retryUpload = useCallback((id: string) => {
    const task = tasksRef.current.find((item) => item.id === id);
    if (!task || task.status !== 'failed') return;

    const entry = entriesRef.current.get(id);
    const hasUploadedFile = !!entry?.uploadedFile;

    dispatch({
      type: 'update',
      id,
      patch: {
        status: 'queued',
        uploadedBytes: hasUploadedFile ? task.fileSize : 0,
        progress: hasUploadedFile ? 100 : 0,
        error: undefined,
        failureStage: undefined,
        startedAt: undefined,
        completedAt: undefined,
      },
    });
  }, []);

  const clearUpload = useCallback((id: string) => {
    const task = tasksRef.current.find((item) => item.id === id);
    if (task?.status === 'queued' || task?.status === 'uploading') cancelUpload(id);
    entriesRef.current.delete(id);
    dispatch({ type: 'remove', id });
  }, [cancelUpload]);

  const clearTerminalUploads = useCallback(() => {
    const terminalIds = tasksRef.current
      .filter((task) =>
        task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled'
      )
      .map((task) => task.id);

    for (const id of terminalIds) entriesRef.current.delete(id);
    dispatch({ type: 'clear-terminal' });
  }, []);

  const value = useMemo<UploadManagerValue>(
    () => ({
      tasks: state.tasks,
      open: state.open,
      collapsed: state.collapsed,
      enqueueUpload,
      enqueueUploads,
      enqueueUploadsAndWait,
      cancelUpload,
      cancelAll,
      retryUpload,
      clearUpload,
      clearTerminalUploads,
      setOpen: (open) => dispatch({ type: 'set-open', open }),
      setCollapsed: (collapsed) => dispatch({ type: 'set-collapsed', collapsed }),
    }),
    [
      cancelAll,
      cancelUpload,
      clearTerminalUploads,
      clearUpload,
      enqueueUpload,
      enqueueUploads,
      enqueueUploadsAndWait,
      retryUpload,
      state.collapsed,
      state.open,
      state.tasks,
    ]
  );

  return <UploadManagerContext.Provider value={value}>{children}</UploadManagerContext.Provider>;
}

export function useUploadManager() {
  const context = useContext(UploadManagerContext);
  if (!context) throw new Error('useUploadManager must be used within UploadManagerProvider');
  return context;
}
