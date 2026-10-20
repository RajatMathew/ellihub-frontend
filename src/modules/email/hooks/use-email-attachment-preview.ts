import { useCallback, useMemo, useRef, useState, type ComponentProps } from 'react';

import { emailApi } from '@/modules/email/api';
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import type {
  FilePreviewDialog,
  FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import type { SaveToFilesScope } from '@/modules/files/save-to-files';

/**
 * How many downloaded attachments are kept for re-preview. Small on purpose:
 * each is a whole file held in memory, and the reader rarely goes back past
 * the last few. Twelve rather than six since the cards draw thumbnails
 * (elli-ui#1361): a message with eight attachments downloads all eight on
 * open, and at six, clicking the first one to preview it downloaded it again.
 * Thumbnails are size-capped, so this stays bounded.
 */
const MAX_CACHED_ATTACHMENT_PREVIEWS = 12;

export type EmailAttachmentPreviewTarget = {
  messageId: string;
  attachment: EmailAttachment;
  /** The projects the file may be saved under, for the dialog's Save to Files. */
  projectScopes?: readonly SaveToFilesScope[];
};

type FilePreviewDialogProps = ComponentProps<typeof FilePreviewDialog>;

/**
 * One attachment preview for a mailbox: which file is open, its download, and
 * the props the shared `FilePreviewDialog` needs to show it.
 *
 * Both the reading pane and the list rows open attachments, and each used to
 * carry its own copy of this — the blob cache, the progress state, the file
 * item built for the dialog. Here it is once, and the caller renders the
 * dialog with `dialogProps` plus whatever `saveToFiles` it can offer.
 *
 * Downloads are cached by promise, so a hover preview and the dialog opening
 * on the same file cost one request, and reopening a file costs none.
 */
export function useEmailAttachmentPreview(accountId: string | null | undefined) {
  const blobCacheRef = useRef(new Map<string, Promise<Blob>>());
  const [previewAttachment, setPreviewAttachment] = useState<EmailAttachmentPreviewTarget | null>(
    null
  );
  const [previewProgress, setPreviewProgress] = useState<{
    loaded: number;
    total: number | null;
  } | null>(null);

  const loadAttachment = useCallback(
    (
      messageId: string,
      attachmentId: string,
      onProgress?: (progress: { loaded: number; total: number | null }) => void
    ) => {
      if (!accountId) return Promise.reject(new Error('Email account is unavailable'));

      const cacheKey = `${accountId}:${messageId}:${attachmentId}`;
      const cached = blobCacheRef.current.get(cacheKey);
      if (cached) return cached;

      const request = emailApi.getAttachment(accountId, messageId, attachmentId, onProgress);
      blobCacheRef.current.set(cacheKey, request);

      if (blobCacheRef.current.size > MAX_CACHED_ATTACHMENT_PREVIEWS) {
        const oldestKey = blobCacheRef.current.keys().next().value;
        if (oldestKey) blobCacheRef.current.delete(oldestKey);
      }

      // A failed download is not kept: the next attempt asks again.
      void request.catch(() => {
        if (blobCacheRef.current.get(cacheKey) === request) {
          blobCacheRef.current.delete(cacheKey);
        }
      });
      return request;
    },
    [accountId]
  );

  const loadPreviewFile = useCallback(
    (file: FilePreviewItem) => {
      if (!previewAttachment) return Promise.reject(new Error('No attachment selected'));
      setPreviewProgress({ loaded: 0, total: file.size && file.size > 0 ? file.size : null });
      const request = loadAttachment(previewAttachment.messageId, file.id, (progress) =>
        setPreviewProgress(progress)
      );
      request.then(
        () => setPreviewProgress(null),
        () => setPreviewProgress(null)
      );
      return request;
    },
    [loadAttachment, previewAttachment]
  );

  /**
   * Built once per attachment, not once per render. `loadPreviewFile` reports
   * download progress into state, so the owner re-renders throughout the
   * download — and an inline object here would hand the dialog a different
   * file every time (elli-ui#975).
   */
  const previewFile = useMemo<FilePreviewItem | null>(
    () =>
      previewAttachment
        ? {
            id: previewAttachment.attachment.id,
            name: previewAttachment.attachment.name,
            displayName: previewAttachment.attachment.name,
            mimeType: previewAttachment.attachment.mimeType,
            size: previewAttachment.attachment.sizeBytes,
            type: 'FILE',
          }
        : null,
    [previewAttachment]
  );

  const openAttachment = useCallback(
    (messageId: string, attachment: EmailAttachment, projectScopes?: readonly SaveToFilesScope[]) =>
      setPreviewAttachment({ messageId, attachment, projectScopes }),
    []
  );

  const dialogProps = useMemo<
    Pick<FilePreviewDialogProps, 'open' | 'onOpenChange' | 'file' | 'loadFile' | 'loadProgress'>
  >(
    () => ({
      open: Boolean(accountId && previewAttachment),
      onOpenChange: (open: boolean) => {
        if (!open) setPreviewAttachment(null);
      },
      file: previewFile,
      loadFile: loadPreviewFile,
      loadProgress: previewProgress,
    }),
    [accountId, loadPreviewFile, previewAttachment, previewFile, previewProgress]
  );

  /** Drops the kept downloads — the reading pane does this as it moves between threads. */
  const clearCache = useCallback(() => {
    blobCacheRef.current.clear();
  }, []);

  return { previewAttachment, loadAttachment, openAttachment, clearCache, dialogProps };
}
