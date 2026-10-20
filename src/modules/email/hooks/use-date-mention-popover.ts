import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import {
  DATE_MENTION_ATTRIBUTE,
  DATE_MENTION_TIME_ATTRIBUTE,
  type DateMentionClick,
} from '@/modules/email/lib/email-date-mentions';

/**
 * How long the pointer rests on a date before its popover opens, and leaves
 * before it closes. Short enough that a hover reads as the way in — at 250ms a
 * reader who paused on a date saw nothing and clicked instead — and long
 * enough that sweeping the pointer across a paragraph opens nothing.
 */
const OPEN_DELAY_MS = 150;
// Just long enough to cross the gap into the popover, so its button can be reached.
const CLOSE_DELAY_MS = 120;

export type ActiveDateMention = DateMentionClick & { element: HTMLElement };

/**
 * Which written date's popover is open (elli-ui#686). The dates live inside
 * the message's shadow root, so they are found on each event's composed path
 * rather than through React. Resting the pointer on one opens its popover;
 * clicking it, or Enter, opens it at once — the way in for touch and keyboard.
 * Moving into the popover keeps it open, so its button can be reached.
 *
 * Hover is read from movement, not only from entering a date: a popover that
 * closed while the pointer was still on its date (Escape, Create event) never
 * came back, because the pointer never entered the date again — the reader had
 * to leave it and return, or click.
 *
 * Moving off the date closes it, however it was opened. A click used to pin it
 * open until dismissed, so a reader who clicked once found popovers that no
 * longer went away when the mouse moved on.
 */
export function useDateMentionPopover(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const [active, setActive] = useState<ActiveDateMention | null>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  /** The date whose popover is showing, and the one waiting out the delay. */
  const shown = useRef<HTMLElement | null>(null);
  const armed = useRef<HTMLElement | null>(null);

  useEffect(() => {
    shown.current = active?.element ?? null;
  }, [active]);

  const cancelTimers = useCallback(() => {
    armed.current = null;
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  }, []);
  const close = useCallback(() => {
    cancelTimers();
    setActive(null);
  }, [cancelTimers]);
  const scheduleClose = useCallback(() => {
    armed.current = null;
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setActive(null), CLOSE_DELAY_MS);
  }, []);
  const keepOpen = useCallback(() => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const open = (element: HTMLElement) => {
      cancelTimers();
      setActive((current) =>
        current?.element === element ? current : { element, ...readMention(element) }
      );
    };
    const onPointerOver = (event: PointerEvent) => {
      const element = mentionOf(event);
      if (!element) return scheduleClose();
      hover(element);
    };
    // Every move over a date, so one whose popover closed under the pointer
    // answers again without the reader leaving it first.
    const onPointerMove = (event: PointerEvent) => {
      const element = mentionOf(event);
      if (element) hover(element);
    };
    const hover = (element: HTMLElement) => {
      window.clearTimeout(closeTimer.current);
      if (!shouldOpenOnHover(element, { shown: shown.current, armed: armed.current })) return;
      window.clearTimeout(openTimer.current);
      armed.current = element;
      openTimer.current = window.setTimeout(() => open(element), OPEN_DELAY_MS);
    };
    const onClick = (event: Event) => {
      const element = mentionOf(event);
      if (!element) return;
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      open(element);
    };

    container.addEventListener('pointerover', onPointerOver);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', scheduleClose);
    container.addEventListener('click', onClick);
    container.addEventListener('keydown', onClick);
    return () => {
      cancelTimers();
      container.removeEventListener('pointerover', onPointerOver);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', scheduleClose);
      container.removeEventListener('click', onClick);
      container.removeEventListener('keydown', onClick);
    };
  }, [cancelTimers, containerRef, enabled, scheduleClose]);

  return { active, close, scheduleClose, keepOpen };
}

/**
 * Whether resting on `element` should start its popover's delay: not when its
 * popover is already showing or already on its way, so moving within a date
 * does not keep restarting the wait.
 */
export function shouldOpenOnHover<T>(
  element: T,
  state: { shown: T | null; armed: T | null }
): boolean {
  return state.shown !== element && state.armed !== element;
}

function mentionOf(event: Event): HTMLElement | undefined {
  return event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.hasAttribute(DATE_MENTION_ATTRIBUTE)
    );
}

function readMention(element: HTMLElement): DateMentionClick {
  return {
    start: new Date(element.getAttribute(DATE_MENTION_ATTRIBUTE)!),
    hasTime: element.getAttribute(DATE_MENTION_TIME_ATTRIBUTE) === 'true',
  };
}
