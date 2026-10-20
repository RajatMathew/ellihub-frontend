import { useEffect, useId, useRef, type ComponentProps, type ReactNode, type Ref } from 'react';

import { Button } from '@/app/components/ui/button';
import { resolveComposeAutoFocusField } from '@/modules/email/lib/email-compose-focus';
import { Minimize2, X } from 'lucide-react';

export interface ComposeAutoFocus {
  /** True when the editor opens with its recipient already settled. */
  preferBody: boolean;
  toFieldId: string;
  bodyFieldId: string;
}

interface EmailComposeSurfaceProps {
  title: string;
  /** The mailbox the message leaves from, when the surface knows it. */
  subtitle?: string;
  /** Draft-save state and the like, rendered beside the chrome controls. */
  status?: ReactNode;
  /**
   * Changes every time the editor is opened. The open focus is keyed off this
   * rather than off the form, so hydration arriving later cannot move the caret
   * out from under the user (elli-ui#925, elli-ui#1011).
   */
  openToken: number;
  autoFocus?: ComposeAutoFocus;
  busy?: boolean;
  /** Steps out of the editor while keeping the message — the draft or the thread. */
  onCollapse?: () => void;
  collapseLabel?: string;
  /** Opens Elliot alongside the draft. Sits just left of Collapse. */
  onOpenAgent?: () => void;
  agentTriggerRef?: Ref<HTMLButtonElement>;
  onClose: () => void;
  closeLabel?: string;
  /** Escape leaves the editor the way the ✕ does. Nested popovers stop the event first. */
  onEscape?: () => void;
  formProps?: ComponentProps<'form'>;
  children: ReactNode;
}

/**
 * The full-page editor. One component for a new message, a draft, a reply and a
 * forward (elli-ui#1008) — before this they were three near-copies of the same
 * chrome that drifted apart field by field.
 *
 * It fills the mail workspace rather than the window: the nav and the message
 * list stay put, and because the layer is opaque, the message underneath no
 * longer shows through the gutter at the bottom (elli-ui#1010). It is
 * deliberately NOT a dialog — no `aria-modal`, nothing inert behind it. It is a
 * labelled region that takes focus on open and hands it back on close.
 */
export function EmailComposeSurface({
  title,
  subtitle,
  status,
  openToken,
  autoFocus,
  busy = false,
  onCollapse,
  collapseLabel = 'Collapse',
  onOpenAgent,
  agentTriggerRef,
  onClose,
  closeLabel = 'Discard and close',
  onEscape,
  formProps,
  children,
}: EmailComposeSurfaceProps) {
  const headingId = useId();
  const paneRef = useRef<HTMLElement>(null);
  // Read at open, never as a dependency: the values behind it keep changing as
  // the user types, and the caret must land where the editor *opened*. The
  // update runs first (effects run in declaration order), so the focus effect
  // below always reads this render's values.
  const autoFocusRef = useRef(autoFocus);
  useEffect(() => {
    autoFocusRef.current = autoFocus;
  });

  useEffect(() => {
    const pane = paneRef.current;
    const config = autoFocusRef.current;
    if (!pane || !config) return;
    const doc = pane.ownerDocument;
    // Synchronous with the commit — no frame in between. A deferred focus lands
    // after the user has started typing, which is exactly the bug in #1011.
    const field = resolveComposeAutoFocusField({
      preferBody: config.preferBody,
      hasFocusInside: pane.contains(doc.activeElement),
    });
    if (!field) return;
    doc.getElementById(field === 'body' ? config.bodyFieldId : config.toFieldId)?.focus();
    // One shot per open: `openToken` changes only when the editor is opened.
  }, [openToken]);

  return (
    // Opaque: the editor covers the reading pane, so nothing behind it may show
    // through the gutter (elli-ui#1010).
    <div className="absolute inset-0 z-30 flex bg-mail-pane p-2">
      <section
        ref={paneRef}
        aria-labelledby={headingId}
        className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg"
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || event.defaultPrevented || !onEscape) return;
          event.preventDefault();
          event.stopPropagation();
          onEscape();
        }}
      >
        <form className="flex min-h-0 flex-1 flex-col" {...formProps}>
          {/*
            Title on the left, the two chrome controls on the right, and nothing
            else. Sending is the one emphatic thing in the footer, and closing is
            a ✕ at the far corner, away from it (elli-ui#921).
          */}
          <div className="flex min-w-0 shrink-0 items-center gap-3 border-b border-mail-pane-line px-4 py-3">
            <h2 id={headingId} className="shrink-0 text-[15px] font-semibold text-mail-ink">
              {title}
            </h2>
            {subtitle && (
              <p className="hidden min-w-0 truncate text-xs text-mail-muted lg:block">{subtitle}</p>
            )}
            <div className="ms-auto flex shrink-0 items-center gap-1.5">
              {status}
              {onOpenAgent && (
                <Button
                  ref={agentTriggerRef}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  aria-label="Open or close Elliot Agent"
                  title="Open or close Elliot Agent (Shift + E)"
                  disabled={busy}
                  onClick={onOpenAgent}
                >
                  <img
                    src="/favicon/apple-touch-icon.png"
                    alt=""
                    aria-hidden="true"
                    className="size-3.5 rounded-[4px] object-contain"
                  />
                  Ask AI
                </Button>
              )}
              {onCollapse && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={busy}
                  onClick={onCollapse}
                >
                  <Minimize2 aria-hidden="true" className="size-3.5" />
                  <span className="hidden sm:inline">{collapseLabel}</span>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7"
                aria-label={closeLabel}
                title={closeLabel}
                disabled={busy}
                onClick={onClose}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>

          {children}
        </form>
      </section>
    </div>
  );
}
