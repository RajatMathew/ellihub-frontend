import { useEffect, useMemo, useRef, useState } from 'react';

import { FileFormatBadge } from '@/app/components/file-format-badge';
import { Button } from '@/app/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/app/components/ui/hover-card';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import {
  getAttachmentPreviewKind,
  resolveAttachmentMimeType,
  toPreviewBlob,
  type AttachmentPreviewKind,
} from '@/modules/email/lib/email-attachment-preview';
import { emailAttachmentDisplayName } from '@/modules/email/lib/email-attachments';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { AlertCircle, RotateCcw } from 'lucide-react';

type AttachmentPreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

type EmailAttachmentHoverCardProps = {
  attachment: EmailAttachment;
  messageId: string;
  loadAttachment?: (messageId: string, attachmentId: string) => Promise<Blob>;
  /**
   * The card is selectable, so the badge has moved out to the checkbox beside
   * this button and drawing a second one would show the format twice
   * (elli-ui#1046).
   */
  hideBadge?: boolean;
  onOpen?: () => void;
};

const MAX_AUTOMATIC_PREVIEW_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_PREVIEW_BYTES = 64 * 1024;

export function EmailAttachmentHoverCard({
  attachment,
  messageId,
  loadAttachment,
  hideBadge = false,
  onOpen,
}: EmailAttachmentHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AttachmentPreviewStatus>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [textPreview, setTextPreview] = useState('');
  const requestRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const isLargeAttachment =
    attachment.sizeBytes !== undefined && attachment.sizeBytes > MAX_AUTOMATIC_PREVIEW_BYTES;
  // Re-typed before the URL exists, not after: the object URL inherits the
  // blob's type, and an `application/octet-stream` PDF behind an iframe is a
  // download rather than a preview (elli-ui#1047).
  const previewUrl = useMemo(() => {
    if (!blob) return null;
    const mimeType = resolveAttachmentMimeType(attachment, blob.type);

    return URL.createObjectURL(toPreviewBlob(blob, mimeType));
  }, [attachment, blob]);
  const previewKind = getAttachmentPreviewKind(attachment, blob?.type);
  // An attached email is named after its subject, with no extension — the chip
  // showed "Payment" and looked like a file nobody could identify.
  const displayName = emailAttachmentDisplayName(attachment);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const loadPreview = () => {
    if (!loadAttachment || isLargeAttachment || status === 'ready' || requestRef.current) {
      return;
    }

    setStatus('loading');
    const request = loadAttachment(messageId, attachment.id)
      .then(async (nextBlob) => {
        const kind = getAttachmentPreviewKind(attachment, nextBlob.type);
        const nextTextPreview =
          kind === 'text' ? await nextBlob.slice(0, MAX_TEXT_PREVIEW_BYTES).text() : '';
        if (!mountedRef.current) return;
        setBlob(nextBlob);
        setTextPreview(nextTextPreview);
        setStatus('ready');
      })
      .catch(() => {
        if (mountedRef.current) setStatus('error');
      })
      .finally(() => {
        if (requestRef.current === request) requestRef.current = null;
      });

    requestRef.current = request;
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) loadPreview();
  };

  return (
    <HoverCard open={open} onOpenChange={handleOpenChange} openDelay={120} closeDelay={100}>
      <HoverCardTrigger asChild>
        {/*
          The file's own row inside the card `EmailAttachmentChip` draws
          around it (elli-ui#1017). Name and size are stacked rather than run
          together on one line: a long name then has the full width of the card
          to truncate against instead of competing with the size for it, and
          the size stops reading as part of the filename.
        */}
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md py-1 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Preview attachment ${displayName}`}
          onClick={() => {
            setOpen(false);
            onOpen?.();
          }}
        >
          {!hideBadge && (
            <FileFormatBadge
              mimeType={attachment.mimeType}
              fileName={displayName}
              className="size-7 rounded-[5px]"
            />
          )}
          <span className="flex min-w-0 flex-col">
            <span
              className="min-w-0 truncate text-[12.5px] font-medium text-mail-ink"
              title={displayName}
            >
              {displayName}
            </span>
            {attachment.size && (
              <span className="text-[11.5px] text-mail-muted">{attachment.size}</span>
            )}
          </span>
        </button>
      </HoverCardTrigger>

      {/*
        Under the attachment, not beside it (elli-ui#1094).

        `side="right"` opened the preview into the only part of the screen it
        could not have: the Additional Details panel. Radix measures collisions
        against the viewport, not against the reading pane, so it never saw the
        panel at all — the card simply drew itself 157px over it, measured, and
        won on z-index. And with no room below the trigger it slid upward to
        stay on screen, which is how a preview ends up floating near the top of
        the pane with the attachment it belongs to several screens away.

        Opening downward puts it inside the message column, which is where the
        width actually is, and `hideWhenDetached` retires it outright once the
        chip has been scrolled out from under it rather than leaving it hovering
        over nothing.
      */}
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        avoidCollisions
        hideWhenDetached
        className="w-96 max-w-[var(--radix-hover-card-content-available-width)] overflow-hidden p-0 motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none"
      >
        <div className="flex min-w-0 items-center gap-2 border-b border-border px-3 py-2.5">
          <FileFormatBadge
            mimeType={attachment.mimeType}
            fileName={displayName}
            className="size-6 rounded-[5px]"
            labelClassName="text-[8px]"
          />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {displayName}
          </p>
          {attachment.size && (
            <span className="shrink-0 text-xs text-muted-foreground">{attachment.size}</span>
          )}
        </div>

        <div className="h-64 bg-muted/30">
          <AttachmentHoverPreview
            attachment={attachment}
            isLargeAttachment={isLargeAttachment}
            previewKind={previewKind}
            previewUrl={previewUrl}
            status={status}
            textPreview={textPreview}
            onRetry={loadPreview}
          />
        </div>

        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Click the attachment to open the full preview.
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

function AttachmentHoverPreview({
  attachment,
  isLargeAttachment,
  previewKind,
  previewUrl,
  status,
  textPreview,
  onRetry,
}: {
  attachment: EmailAttachment;
  isLargeAttachment: boolean;
  previewKind: AttachmentPreviewKind;
  previewUrl: string | null;
  status: AttachmentPreviewStatus;
  textPreview: string;
  onRetry: () => void;
}) {
  const displayName = emailAttachmentDisplayName(attachment);
  if (isLargeAttachment) {
    return (
      <AttachmentPreviewMessage
        attachment={attachment}
        title="Large preview paused"
        description="Open the attachment when you’re ready to load the full file."
      />
    );
  }

  if (status === 'loading') {
    return (
      <div className="space-y-3 p-4" role="status" aria-label="Loading attachment preview">
        <Skeleton className="h-5 w-2/3 motion-reduce:animate-none" />
        <Skeleton className="h-36 w-full motion-reduce:animate-none" />
        <Skeleton className="h-4 w-1/2 motion-reduce:animate-none" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
        <AlertCircle aria-hidden="true" className="size-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Couldn’t load preview</p>
          <p className="mt-1 text-xs text-muted-foreground">Try again or open the attachment.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Try again
        </Button>
      </div>
    );
  }

  if (status !== 'ready' || !previewUrl) {
    return (
      <AttachmentPreviewMessage
        attachment={attachment}
        title="Preview available on open"
        description="Click the attachment to view or download this file."
      />
    );
  }

  if (previewKind === 'image') {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <img
          src={previewUrl}
          alt={`Preview of ${displayName}`}
          className="max-h-full max-w-full rounded-sm object-contain"
        />
      </div>
    );
  }

  if (previewKind === 'pdf') {
    return (
      <iframe
        src={`${previewUrl}#toolbar=0&navpanes=0`}
        title={`Preview of ${displayName}`}
        // Out of the tab order on purpose. A hover preview is a glance, not a
        // destination, and a focusable PDF frame inside a floating card invites
        // the browser to scroll whatever it is sitting over in order to reveal
        // it.
        tabIndex={-1}
        className="h-full w-full border-0 bg-background"
      />
    );
  }

  if (previewKind === 'video') {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <video
          src={previewUrl}
          controls
          preload="metadata"
          className="max-h-full max-w-full rounded-sm"
        >
          Your browser does not support video previews.
        </video>
      </div>
    );
  }

  if (previewKind === 'audio') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 p-5">
        <FileTypeIcon
          fileType="FILE"
          mimeType={attachment.mimeType}
          fileName={attachment.name}
          aria-hidden="true"
          className="size-12"
        />
        <audio src={previewUrl} controls preload="metadata" className="w-full">
          Your browser does not support audio previews.
        </audio>
      </div>
    );
  }

  if (previewKind === 'text') {
    return (
      <pre className="h-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5 text-foreground">
        {textPreview || 'This text file is empty.'}
      </pre>
    );
  }

  return (
    <AttachmentPreviewMessage
      attachment={attachment}
      title="Preview not available"
      description="Click the attachment to open or download this file."
    />
  );
}

function AttachmentPreviewMessage({
  attachment,
  title,
  description,
}: {
  attachment: EmailAttachment;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
      <FileTypeIcon
        fileType="FILE"
        mimeType={attachment.mimeType}
        fileName={attachment.name}
        aria-hidden="true"
        className="size-10"
      />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-64 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
