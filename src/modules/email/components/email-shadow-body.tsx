import { useEffect, useMemo, useRef } from 'react';

import { EmailDateMentionPopover } from '@/modules/email/components/email-date-mention-popover';
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import { useDateMentionPopover } from '@/modules/email/hooks/use-date-mention-popover';
import { useDocumentThemeKey } from '@/modules/email/hooks/use-document-theme-key';
import type { DateMentionClick } from '@/modules/email/lib/email-date-mentions';
import {
  mountEmailBody,
  type BrowserOptions,
  type EmailBodyRenderer,
} from '@/modules/email/lib/email-renderer/browser';
import {
  activateEmailBody,
  prepareShadowEmailBody,
  type InlineImageActivation,
} from '@/modules/email/lib/email-shadow-body';
import { readEmailTheme } from '@/modules/email/lib/email-theme-colors';

const EMPTY_ATTACHMENTS: EmailAttachment[] = [];

type EmailShadowBodyProps = {
  html: string;
  attachments?: EmailAttachment[];
  inlineImageBaseUrl?: string | null;
  /** Collapsed clamps to three lines and hides images. */
  expanded?: boolean;
  /** When the message was sent — what "tomorrow" in it is read against. */
  sentAt?: string;
  /**
   * Turns a date written in the message into an event (elli-ui#686). Dates are
   * only marked when this is given — without it an underline would do nothing.
   */
  onDateMention?: (mention: DateMentionClick) => void;
};

/**
 * Renders a message body with Macro's renderer, around our own transforms —
 * the full order is documented in `lib/email-shadow-body.ts`.
 *
 * The host element is created inside the effect rather than rendered by React.
 * `attachShadow` can be called once per element, and StrictMode mounts every
 * effect twice — a React-owned host would throw on the second mount.
 */
export function EmailShadowBody({
  html,
  attachments = EMPTY_ATTACHMENTS,
  inlineImageBaseUrl,
  expanded = true,
  sentAt,
  onDateMention,
}: EmailShadowBodyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<EmailBodyRenderer | null>(null);
  const themeKey = useDocumentThemeKey();

  // Keyed by content, not by array identity. Callers write
  // `message.attachments ?? []`, so a message without attachments hands us a
  // new array on every render — and remounting would re-run the whole body.
  const attachmentKey = attachments
    .map((attachment) => `${attachment.id}:${attachment.contentId ?? ''}`)
    .join('|');
  const stableAttachments = useMemo(
    () => attachments,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the real dependency
    [attachmentKey]
  );
  // Read when the images activate, and handed to them whenever they change, so a
  // new attachment list fills in images without remounting the body.
  const attachmentsRef = useRef(stableAttachments);
  const imagesRef = useRef<InlineImageActivation | null>(null);

  const marksDates = Boolean(onDateMention && sentAt);
  const prepared = useMemo(
    () => prepareShadowEmailBody(html, inlineImageBaseUrl, marksDates ? new Date(sentAt!) : null),
    [html, inlineImageBaseUrl, marksDates, sentAt]
  );
  // Read at click time, so a new handler each render does not remount the body.
  const onDateMentionRef = useRef(onDateMention);
  useEffect(() => {
    onDateMentionRef.current = onDateMention;
  }, [onDateMention]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const host = document.createElement('div');
    // Pane width, so wide designed mail scrolls inside it instead of the page.
    host.style.minWidth = '0';
    host.style.width = '100%';
    container.replaceChildren(host);

    // Designed mail (tables, no conversation) is kept as sent, on white; the rest
    // is adapted to the theme. The rule lives in `shouldAdaptEmailColors`.
    const adaptColors = prepared.adaptColors;
    if (!adaptColors) host.setAttribute('data-elli-fixed-light', '');

    const options: BrowserOptions = {
      theme: readEmailTheme(container),
      adaptColors,
      normalizeFonts: false,
      expanded: true,
      resolveImages: async (root, lifetime) => {
        imagesRef.current = activateEmailBody(root, lifetime, {
          attachments: attachmentsRef.current,
          apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
          visibleContentIds: prepared.visibleContentIds,
        });
        lifetime.onDispose(() => {
          imagesRef.current = null;
        });
      },
      onResourceError: (error) => console.warn('Failed to load inline email images', error),
    };
    const renderer = mountEmailBody(host, prepared.body, options);
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      host.remove();
    };
    // `themeKey` is not read here, and is the point: a theme change remounts
    // the body with the new colours, as Macro does (its theme is part of the
    // memo that builds the host). Adaptation always starts from the original
    // markup, so switching back and forth never compounds.
  }, [prepared, themeKey]);

  useEffect(() => {
    attachmentsRef.current = stableAttachments;
    imagesRef.current?.setAttachments(stableAttachments);
  }, [stableAttachments]);

  const dates = useDateMentionPopover(containerRef, marksDates);

  // Toggling keeps the mounted content and its loaded images.
  useEffect(() => {
    rendererRef.current?.setExpanded(expanded);
  }, [expanded, prepared, themeKey]);

  return (
    <>
      <div ref={containerRef} className="min-w-0 w-full px-4" />
      <EmailDateMentionPopover
        mention={dates.active}
        onClose={dates.close}
        onPointerEnter={dates.keepOpen}
        onPointerLeave={dates.scheduleClose}
        onCreate={({ start, hasTime }) => {
          dates.close();
          onDateMentionRef.current?.({ start, hasTime });
        }}
      />
    </>
  );
}
