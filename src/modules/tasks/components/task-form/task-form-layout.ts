/**
 * Class names for the parts of the task dialog that no shadcn primitive covers
 * on its own.
 *
 * They live here rather than inline for the same reason `form-page-layout.ts`
 * exists for form pages: the two segmented controls in the dialog are the same
 * control, and a class string copied into both places is one that drifts apart.
 * Everything below composes the vendored primitives and the theme tokens — no
 * raw colours, no pixel values.
 */

/**
 * The title field. It carries no box: the placeholder is the label, and the rule
 * beneath it is the field's own bottom border so it can turn to the focus colour
 * when tabbed into — a borderless input with no ring is invisible to the
 * keyboard. `aria-invalid` colours the same rule, so a missing title reads
 * without adding anything.
 */
export const taskTitleFieldClassName =
  'h-auto rounded-none border-0 border-b border-input bg-transparent px-0 pb-3 text-3xl font-semibold shadow-none placeholder:text-muted-foreground/50 focus-visible:border-b-ring focus-visible:ring-0';

/** The track a segmented control sits in: the unchosen options read as one field. */
export const segmentedTrackClassName = 'w-fit gap-0 rounded-lg border border-input bg-muted p-1';

/**
 * One segment. Chosen segments lift out of the track rather than filling with
 * accent, which is what tells three near-identical words apart at a glance.
 */
export const segmentedItemClassName =
  'gap-2 rounded-md px-3 text-sm text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm';

/** The dot that carries a segment's meaning — priority colour, or whose court. */
export const segmentedDotClassName = 'size-2 shrink-0 rounded-full';

/** The description disclosure row: a quiet control, not a heading. */
export const disclosureTriggerClassName =
  'flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/30 rounded-sm';

/** Date and time sit at their natural width rather than filling the dialog. */
export const dueFieldClassName = 'w-auto';
