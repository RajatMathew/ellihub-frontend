import { createContext, useContext } from 'react';

import type { FileUploadPayload } from '@/modules/files/api/files.api';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import type { UploadTask, UploadTaskOptions } from '@/modules/files/uploads/upload-manager';

export interface UploadManagerValue {
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

/**
 * The context and its hook, apart from the provider that fills them.
 *
 * `upload-manager.tsx` exports a component, and Fast Refresh stops working for
 * a file that also exports a hook or a constant.
 */
export const UploadManagerContext = createContext<UploadManagerValue | null>(null);

export function useUploadManager() {
  const context = useContext(UploadManagerContext);
  if (!context) throw new Error('useUploadManager must be used within UploadManagerProvider');
  return context;
}
