import { useState } from 'react';

import type { TaskEmailReference } from '@/modules/tasks/schemas/task.schema';

/**
 * Where a task came from, on the card.
 *
 * A task can cite several threads, but a card is a glance — so three is the
 * most it will show, and the rest sit behind a count you can open in place.
 *
 * Deliberately a plain button rather than a popover: the card is a dnd-kit drag
 * handle, and a Radix trigger inside one is the component in this module that
 * cannot be driven under test. Expanding in place costs a little height and
 * keeps the whole card testable and keyboard-operable.
 */

const VISIBLE_LIMIT = 3;

function labelFor(reference: TaskEmailReference) {
  return reference.subject?.trim() || reference.fromEmail?.trim() || 'linked message';
}

export function TaskCardEmailSources({ references }: { references: TaskEmailReference[] }) {
  const [expanded, setExpanded] = useState(false);

  if (references.length === 0) return null;

  const hidden = references.length - VISIBLE_LIMIT;
  const shown = expanded ? references : references.slice(0, VISIBLE_LIMIT);

  return (
    // The design tints the provenance rather than greying it, which is what
    // stops it reading as another line of description.
    <div className="space-y-0.5 text-xs italic text-destructive/75">
      {shown.map((reference, index) => (
        <p key={`${reference.providerId}-${index}`} className="truncate">
          {/* The lead-in is said once. Repeating it down the list turns three
              sources into three sentences that all start the same way. */}
          {index === 0 ? 'from email · ' : null}
          {labelFor(reference)}
        </p>
      ))}

      {hidden > 0 ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="not-italic font-medium text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? 'Show less' : `+${hidden}`}
        </button>
      ) : null}
    </div>
  );
}
