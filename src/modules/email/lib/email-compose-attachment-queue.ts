/**
 * Serialises attachment uploads for one composer.
 *
 * Attaching a file POSTs the whole draft, and a 25 MB file spends tens of
 * seconds on the wire. The composer used to handle a second selection by
 * aborting the first — which threw away every byte already uploaded and left
 * that file to be uploaded a second time when the message was sent. Here a new
 * selection instead *queues*: nothing in flight is discarded, and everything
 * that arrives while a batch is uploading is coalesced into the single request
 * that follows it, so N files cost at most N requests and usually far fewer.
 *
 * Only `cancel()` aborts, which is what the per-file remove needs: an upload
 * that never answers must stay escapable (elli-ui#910).
 */

/**
 * Uploads one batch. It owns its own failure reporting — the queue keeps
 * draining whatever a batch does, so a rejection here would only surface as an
 * unhandled rejection and strand the files still waiting behind it.
 */
export type AttachmentBatchUploader = (files: File[], signal: AbortSignal) => Promise<void>;

export interface AttachmentPreparationQueue {
  /** Adds files to the queue, starting the drain if it is not already running. */
  enqueue: (files: File[]) => void;
  /** Drops everything queued and aborts the batch in flight. */
  cancel: () => void;
  /** Resolves once nothing is queued or in flight. Never rejects. */
  settled: () => Promise<void>;
  /** True while a batch is in flight or waiting. */
  isBusy: () => boolean;
}

export function createAttachmentPreparationQueue(options: {
  upload: AttachmentBatchUploader;
  /** Called on every idle→busy and busy→idle transition, never twice in a row. */
  onBusyChange?: (isBusy: boolean) => void;
}): AttachmentPreparationQueue {
  const { upload, onBusyChange } = options;
  let queued: File[] = [];
  let draining: Promise<void> | null = null;
  let controller: AbortController | null = null;

  async function drain(): Promise<void> {
    try {
      while (queued.length > 0) {
        // Take everything waiting, not one file at a time: the draft endpoint
        // accepts many attachments per request, so coalescing turns a burst of
        // selections into a single upload.
        const batch = queued;
        queued = [];
        controller = new AbortController();
        try {
          await upload(batch, controller.signal);
        } finally {
          controller = null;
        }
      }
    } finally {
      draining = null;
      onBusyChange?.(false);
    }
  }

  return {
    enqueue(files) {
      if (files.length === 0) return;
      queued = [...queued, ...files];
      if (draining) return;
      onBusyChange?.(true);
      draining = drain();
    },
    cancel() {
      queued = [];
      controller?.abort();
      controller = null;
    },
    settled() {
      return draining ?? Promise.resolve();
    },
    isBusy() {
      return draining !== null;
    },
  };
}
