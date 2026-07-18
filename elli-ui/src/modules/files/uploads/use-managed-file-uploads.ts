import { useCallback } from 'react';

import type { FileUploadPayload } from '@/modules/files/api/files.api';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { useUploadManager, type UploadTaskOptions } from '@/modules/files/uploads/upload-manager';

type UploadNameResolver = (file: File) => string;

type ManagedUploadCallback = (
  uploadedFile: FileItem,
  file: File,
  payload: FileUploadPayload
) => Promise<void> | void;

type ManagedUploadFailureCallback = (
  error: unknown,
  file: File,
  payload: FileUploadPayload
) => Promise<void> | void;

type ManagedUploadCancelledCallback = (
  file: File,
  payload: FileUploadPayload
) => Promise<void> | void;

export interface ManagedFileUploadOptions {
  files: File[];
  parentId: string;
  label: string;
  getName?: UploadNameResolver;
  onUploaded?: ManagedUploadCallback;
  onFailed?: ManagedUploadFailureCallback;
  onCancelled?: ManagedUploadCancelledCallback;
}

function defaultUploadName(file: File) {
  return file.name;
}

export function createFileUploadPayload(
  file: File,
  parentId: string,
  getName: UploadNameResolver = defaultUploadName
): FileUploadPayload {
  return {
    file,
    data: {
      name: getName(file),
      parentId,
      mimeType: file.type || undefined,
      size: file.size,
    },
  };
}

export function createFileUploadPayloads(
  files: File[],
  parentId: string,
  getName?: UploadNameResolver
): FileUploadPayload[] {
  return files.map((file) => createFileUploadPayload(file, parentId, getName));
}

function toUploadTaskOptions(options: ManagedFileUploadOptions): UploadTaskOptions {
  return {
    label: options.label,
    onUploaded: options.onUploaded
      ? (uploadedFile, payload) => options.onUploaded?.(uploadedFile, payload.file, payload)
      : undefined,
    onFailed: options.onFailed
      ? (error, payload) => options.onFailed?.(error, payload.file, payload)
      : undefined,
    onCancelled: options.onCancelled
      ? (payload) => options.onCancelled?.(payload.file, payload)
      : undefined,
  };
}

export function useManagedFileUploads() {
  const { enqueueUploads, enqueueUploadsAndWait } = useUploadManager();

  const queueFiles = useCallback(
    (options: ManagedFileUploadOptions) => {
      if (options.files.length === 0) return [];

      return enqueueUploads(
        createFileUploadPayloads(options.files, options.parentId, options.getName),
        toUploadTaskOptions(options)
      );
    },
    [enqueueUploads]
  );

  const uploadFilesAndWait = useCallback(
    (options: ManagedFileUploadOptions) => {
      if (options.files.length === 0) return Promise.resolve<FileItem[]>([]);

      return enqueueUploadsAndWait(
        createFileUploadPayloads(options.files, options.parentId, options.getName),
        toUploadTaskOptions(options)
      );
    },
    [enqueueUploadsAndWait]
  );

  return { queueFiles, uploadFilesAndWait };
}
