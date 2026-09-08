import { useId, useState } from 'react';

import { useEmailReferenceLink } from '@/modules/tasks/hooks/use-email-reference-link';
import type { TaskEmailReference } from '@/modules/tasks/schemas/task.schema';
import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Where a task came from, on the card.
 *
 * Each source opens the message it names, so a card is a way back into the mail
 * rather than a note about it — that round trip is most of why a task records
 * its provenance at all.
 *
 * A task can cite several threads, but a card is a glance — so three is the
 * most it will show, and the rest sit behind a count you can open in place.
 *
 * The count is deliberately a plain button rather than a popover: the card is a
 * dnd-kit drag handle, and a Radix trigger inside one is the component in this
 * module that cannot be driven under test. Expanding in place costs a little
 * height and keeps the whole card testable and keyboard-operable.
 *
 * The heading is a heading, not the first few words of the first source. Run
 * inline — `from email · Re: it works now` — it read as another subject in the
 * list, which is the one thing the label exists to prevent. Nothing here is
 * tinted any more either: this was `destructive`, the colour of a delete
 * confirmation, on a card that is perfectly fine. Provenance is metadata, so it
 * is said in the greys the rest of the card already speaks in.
 */

const VISIBLE_LIMIT = 3;

function labelFor(reference: TaskEmailReference) {
  return reference.subject?.trim() || reference.fromEmail?.trim() || 'linked message';
}

export function TaskCardEmailSources({ references }: { references: TaskEmailReference[] }) {
  const [expanded, setExpanded] = useState(false);
  const linkFor = useEmailReferenceLink();
  const headingId = useId();

  if (references.length === 0) return null;

  const hidden = references.length - VISIBLE_LIMIT;
  const shown = expanded ? references : references.slice(0, VISIBLE_LIMIT);

  return (
    // Ruled off the way the deadline above it is — half the theme's hairline,
    // so it separates rather than divides. That rule is what makes this a
    // section of the card rather than a sentence trailing off the end of it.
    <div className="space-y-2 border-t border-border/50 pt-3">
      {/* Small caps and a mail glyph, borrowing the idiom of the entity badges
          higher up the card. No shadcn primitive covers a label for a plain
          list — `FieldLegend` belongs to a form — so this is markup, built out
          of tokens. */}
      <p
        id={headingId}
        className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"
      >
        <Mail className="size-3 shrink-0" aria-hidden="true" />
        From email
      </p>

      <ul aria-labelledby={headingId} className="space-y-1.5 text-xs">
        {shown.map((reference, index) => {
          const label = labelFor(reference);
          const href = linkFor(reference);

          return (
            <li key={`${reference.providerId}-${index}`} className="truncate">
              {href ? (
                <Link
                  to={href}
                  title={label}
                  // Stops the click reaching the card's own open-the-task handler.
                  onClick={(event) => event.stopPropagation()}
                  className="text-foreground/75 underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {label}
                </Link>
              ) : (
                // The accounts are still loading, or this mailbox is gone. A task
                // outlives the account it was raised from, so the provenance is
                // still worth showing — just not as a link to nowhere.
                <span className="text-foreground/75">{label}</span>
              )}
            </li>
          );
        })}
      </ul>

      {hidden > 0 ? (
        // `info`, the same token `+1 day` uses a few lines up. This is the other
        // thing on the card you can click, and in muted-foreground it read as a
        // third shade of grey and vanished into the list above it.
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="text-xs font-semibold text-info underline-offset-2 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? 'Show less' : `+${hidden}`}
        </button>
      ) : null}
    </div>
  );
}
