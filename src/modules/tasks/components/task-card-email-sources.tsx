import { useState } from 'react';

import { useEmailReferenceLink } from '@/modules/tasks/hooks/use-email-reference-link';
import type { TaskEmailReference } from '@/modules/tasks/schemas/task.schema';
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
 */

const VISIBLE_LIMIT = 3;

function labelFor(reference: TaskEmailReference) {
  return reference.subject?.trim() || reference.fromEmail?.trim() || 'linked message';
}

export function TaskCardEmailSources({ references }: { references: TaskEmailReference[] }) {
  const [expanded, setExpanded] = useState(false);
  const linkFor = useEmailReferenceLink();

  if (references.length === 0) return null;

  const hidden = references.length - VISIBLE_LIMIT;
  const shown = expanded ? references : references.slice(0, VISIBLE_LIMIT);

  return (
    // The design tints the provenance rather than greying it, which is what
    // stops it reading as another line of description.
    <div className="space-y-0.5 text-xs italic text-destructive/75">
      {shown.map((reference, index) => {
        const label = labelFor(reference);
        const href = linkFor(reference);

        return (
          <p key={`${reference.providerId}-${index}`} className="truncate">
            {/* The lead-in is said once. Repeating it down the list turns three
                sources into three sentences that all start the same way. */}
            {index === 0 ? 'from email · ' : null}
            {href ? (
              <Link
                to={href}
                title={label}
                // Stops the click reaching the card's own open-the-task handler.
                onClick={(event) => event.stopPropagation()}
                className="underline-offset-2 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </Link>
            ) : (
              // The accounts are still loading, or this mailbox is gone. A task
              // outlives the account it was raised from, so the provenance is
              // still worth showing — just not as a link to nowhere.
              label
            )}
          </p>
        );
      })}

      {hidden > 0 ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="font-medium not-italic text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? 'Show less' : `+${hidden}`}
        </button>
      ) : null}
    </div>
  );
}
