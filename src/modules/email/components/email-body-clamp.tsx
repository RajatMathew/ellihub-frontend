import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Height past which a body is folded, in px. Roughly a screenful on a laptop:
 * enough that a normal mail is never clamped, low enough that a signature
 * block plus a quoted chain always is.
 */
const CLAMP_HEIGHT = 560;

/**
 * Slack in the measurement. A body a hair taller than the limit would
 * otherwise get a "Show more" that reveals twenty pixels.
 */
const CLAMP_TOLERANCE = 80;

/**
 * Folds a long message body behind a "Show more" (elli-ui#1044).
 *
 * A single reply carrying its whole quoted history is several screens of text
 * nobody asked for, and a ten-message thread with ten of those is unnavigable —
 * so this wraps each message's body rather than the thread, and every long
 * message gets its own toggle.
 *
 * It measures the rendered body instead of guessing from the source, because
 * the HTML path is a sandboxed frame whose height is only known once the frame
 * has reported it (see `EmailHtmlBody`). A `ResizeObserver` on the wrapper
 * catches that late report, and every later one — images finishing, the quoted
 * chain being revealed inside the frame — so a body that grows past the limit
 * after first paint still folds.
 */
export function EmailBodyClamp({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const height = entry?.contentRect.height;
      if (typeof height === 'number') setContentHeight(height);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const overflows = contentHeight > CLAMP_HEIGHT + CLAMP_TOLERANCE;
  const clamped = overflows && !expanded;

  const toggle = (
    <button
      type="button"
      className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-transparent bg-sidebar-bg px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sidebar-bg/25 hover:bg-sidebar-bg/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
      aria-expanded={expanded}
      onClick={() => setExpanded((current) => !current)}
    >
      {expanded ? (
        <ChevronUp aria-hidden="true" className="size-3.5" />
      ) : (
        <ChevronDown aria-hidden="true" className="size-3.5" />
      )}
      {expanded ? 'Show less' : 'Show more'}
    </button>
  );

  return (
    <div className="relative">
      <div
        className={cn(
          overflows &&
            'overflow-hidden motion-safe:transition-[max-height] motion-safe:duration-300'
        )}
        style={overflows ? { maxHeight: clamped ? CLAMP_HEIGHT : contentHeight } : undefined}
      >
        {/*
          The observed element wraps the body and is never itself clamped —
          `maxHeight` goes on the parent. Measuring a clamped element reports
          the clamped height, which would make `overflows` false the moment it
          became true and flip the toggle on and off forever.
        */}
        <div ref={contentRef}>{children}</div>
      </div>

      {clamped && (
        /* Over the fold, not after it: the body keeps the height it was given,
           and the gradient says the text continues underneath. */
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-mail-card"
        />
      )}

      {/*
        Folded, the control sits over the fold at the end of the visible part —
        which is where the eye already is when it runs out of text.
      */}
      {clamped && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          {toggle}
        </div>
      )}

      {/*
        Expanded, the control follows you down the message and stays pinned to
        its bottom edge — it never floats over the next message. This is why
        the message `<article>` is `overflow-clip` rather than
        `overflow-hidden`: both clip to the rounded corners, but `hidden` makes
        the article a scroll container, and a sticky child then pins itself to
        a box that never scrolls, which looks exactly like `position: static`.
      */}
      {expanded && overflows && (
        <div className="pointer-events-none sticky bottom-7 z-10 mt-3 flex justify-center">
          {toggle}
        </div>
      )}
    </div>
  );
}
