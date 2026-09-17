import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Info } from 'lucide-react';

type Shortcut = { keys: string[]; label: string };
type ShortcutSection = { title: string; shortcuts: Shortcut[] };

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
      { keys: ['⌘', '↵'], label: 'Send' },
      { keys: ['Esc'], label: 'Collapse a full-screen reply, or discard it' },
    ],
  },
  {
    title: 'Anywhere',
    shortcuts: [
      { keys: ['⌘', 'N'], label: 'New message' },
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-lg text-mail-muted hover:bg-mail-card hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <Info aria-hidden="true" className="size-4" strokeWidth={1.6} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        // Pointer events off on the content so moving the cursor toward it does
        // not count as leaving the trigger and close it out from under you; the
        // list is read, never interacted with.
        className="pointer-events-none max-h-[min(var(--radix-popover-content-available-height),30rem)] w-80 overflow-y-auto rounded-xl border-mail-line bg-mail-card p-4"
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
