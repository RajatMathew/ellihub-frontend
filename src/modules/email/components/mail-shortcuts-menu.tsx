import { useEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { IS_APPLE_PLATFORM, modifierKeyLabel } from '@/modules/email/lib/email-send-shortcut';
import { Info } from 'lucide-react';

type Shortcut = { keys: string[]; label: string };
type ShortcutSection = { title: string; shortcuts: Shortcut[] };

/**
 * The list printed ⌘ whatever keyboard was reading it, so on Windows two of
 * these named a key the reader does not have (elli-ui#1199). Both modifiers
 * work in the handlers either way; only the label follows the platform.
 */
const MOD = modifierKeyLabel(IS_APPLE_PLATFORM);

/**
 * What the mailbox answers to, as the reader would describe it.
 *
 * Grouped by where you are rather than by key, because that is how anyone looks
 * one up: "how do I get to the next conversation", not "what does J do". Kept
 * here beside nothing else so the list and the handlers cannot drift — every
 * entry below is wired in `mailbox-page.tsx` or `email-reading-pane.tsx`.
 */
const MAIL_SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Moving around',
    shortcuts: [
      { keys: ['↑', '↓'], label: 'Previous / next conversation' },
      { keys: ['J', 'K'], label: 'Same, without leaving the home row' },
      { keys: ['/'], label: 'Jump to search' },
    ],
  },
  {
    title: 'This conversation',
    shortcuts: [
      { keys: ['R'], label: 'Reply' },
      { keys: ['E'], label: 'Expand or collapse every message' },
      { keys: ['F'], label: 'Flag' },
      { keys: ['A'], label: 'Archive' },
      { keys: ['D'], label: 'Delete' },
    ],
  },
  {
    title: 'While writing',
    shortcuts: [
      { keys: [MOD, '↵'], label: 'Send' },
      { keys: ['Esc'], label: 'Collapse a full-screen reply, or discard it' },
    ],
  },
  {
    title: 'Anywhere',
    shortcuts: [
      { keys: [MOD, 'N'], label: 'New message' },
      { keys: ['@'], label: 'Link a project, RFQ, PO or invoice' },
      { keys: ['⇧', 'E'], label: 'Open or close Elliot' },
    ],
  },
];

/**
 * The shortcut list, behind the `i` in the reading pane's toolbar.
 *
 * A popover rather than a tooltip: it opens on hover for a glance and stays on
 * a click, which is what you want when you are reading down a list of a dozen
 * keys rather than confirming one.
 */
export function MailShortcutsMenu() {
  const [open, setOpen] = useState(false);
  /**
   * Opened by a click rather than a hover, and so not the pointer's to close.
   *
   * The component has always claimed to "stay on a click", but the trigger
   * closed on `mouseleave` whatever had opened it — so a click bought nothing,
   * and reading to the end of a list taller than the panel meant keeping the
   * cursor on a 30px button the whole way down. Pinned, only Escape, a click
   * away, or a second click on the trigger puts it away.
   */
  const [pinned, setPinned] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current === null) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  /**
   * Closing is deferred by a beat rather than done on the leave itself.
   * Trigger and panel are separate elements with an 8px gap between them, so
   * crossing from one to the other puts the pointer over neither for a frame;
   * closing on that flicker is what made the panel unreachable.
   */
  const scheduleClose = () => {
    if (pinned) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => cancelClose, []);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPinned(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-lg text-mail-muted hover:bg-mail-card hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
          aria-label="Keyboard shortcuts"
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          onClick={() => {
            // Radix toggles `open` for us; this only records that the pointer
            // no longer owns the panel's lifetime.
            cancelClose();
            setPinned((current) => (open ? !current : true));
          }}
        >
          <Info aria-hidden="true" className="size-4" strokeWidth={1.6} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        /**
         * The panel takes pointer events (elli-ui#1021). It used to refuse them
         * so that moving the cursor onto it could not read as leaving the
         * trigger — on the assumption that the list is only ever read. But the
         * list is taller than the panel, so it has to be scrolled, and a
         * `pointer-events-none` element cannot take a wheel: the last section,
         * "Anywhere", was unreachable. The grace period above buys what the
         * dead panel was buying, without costing the scroll.
         */
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        // Opened by hover, so it must not pull focus out of whatever the reader
        // was doing. Wheel and drag still scroll it; Escape and a click away
        // still dismiss it.
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="max-h-[min(var(--radix-popover-content-available-height),30rem)] w-80 overflow-y-auto overscroll-contain rounded-xl border-mail-line bg-mail-card p-4"
      >
        <h2 className="sr-only">Keyboard shortcuts</h2>
        <dl className="flex flex-col gap-4">
          {MAIL_SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-[12.5px] text-mail-muted">{section.title}</p>
              <div className="flex flex-col gap-2">
                {section.shortcuts.map((shortcut) => (
                  <div key={shortcut.label} className="flex items-start gap-3">
                    <dt className="flex shrink-0 gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="min-w-7 rounded-md border border-mail-line bg-mail-card px-1.5 py-0.5 text-center font-mono text-[11px] text-mail-mid"
                        >
                          {key}
                        </kbd>
                      ))}
                    </dt>
                    <dd className="min-w-0 pt-0.5 text-[13px] leading-snug text-mail-ink">
                      {shortcut.label}
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
