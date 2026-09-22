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
 * How much room the form has to breathe in.
 *
 * The same fields serve the dialog on the board and the popover beside an open
 * email. Only the scale differs between them — nothing is added or dropped — so
 * it is one number, passed down, rather than two copies of the field set.
 */
export type TaskFormDensity = 'comfortable' | 'compact';

/**
 * The title field. It carries no box: the placeholder is the label, and the rule
 * beneath it is the field's own bottom border so it can turn to the focus colour
 * when tabbed into — a borderless input with no ring is invisible to the
 * keyboard. `aria-invalid` colours the same rule, so a missing title reads
 * without adding anything.
 */
export const taskTitleFieldClassName = (density: TaskFormDensity = 'comfortable') =>
  `h-auto rounded-none border-0 border-b border-input bg-transparent px-0 pt-2 shadow-none font-semibold placeholder:text-muted-foreground/50 focus-visible:border-b-ring focus-visible:ring-0 ${
    density === 'comfortable'
      ? 'pb-4 text-4xl'
      : // An input cannot wrap, so on a phone the size decides how much of a
        // long email subject you can read at once. `2xl` showed about twenty
        // characters of it before clipping.
        'pb-2 text-lg sm:text-2xl'
  }`;

/** A field's own label. Quieter in the popover, where the title is smaller too. */
export const fieldLabelClassName = (density: TaskFormDensity = 'comfortable') =>
  density === 'comfortable' ? 'text-base' : 'text-sm';

/**
 * The gap between one field and the next — the whole of the airiness, really.
 *
 * Compact is 16px. It was 20px, which with each field's own label gap on top
 * made the dialog read as a list of islands rather than one form.
 */
export const fieldStackClassName = (density: TaskFormDensity = 'comfortable') =>
  density === 'comfortable' ? 'space-y-7' : 'space-y-4';

/** The track a segmented control sits in: the unchosen options read as one field. */
export const segmentedTrackClassName = (density: TaskFormDensity = 'comfortable') =>
  `w-fit gap-0 rounded-lg border border-input bg-muted ${
    density === 'comfortable' ? 'p-1.5' : 'p-0.5'
  }`;

/**
 * One segment. Chosen segments lift out of the track rather than filling with
 * accent, which is what tells three near-identical words apart at a glance.
 */
export const segmentedItemClassName = (density: TaskFormDensity = 'comfortable') =>
  `rounded-md text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm ${
    density === 'comfortable' ? 'gap-2 px-4 text-base' : 'gap-1.5 px-2.5 text-[13px]'
  }`;

/** The dot that carries a segment's meaning — priority colour, or whose court. */
export const segmentedDotClassName = (density: TaskFormDensity = 'comfortable') =>
  `shrink-0 rounded-full ${density === 'comfortable' ? 'size-2.5' : 'size-2'}`;

/** The description disclosure row: a quiet control, not a heading. */
export const disclosureTriggerClassName = (density: TaskFormDensity = 'comfortable') =>
  `flex cursor-pointer items-center gap-2 font-medium text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/30 rounded-sm ${
    density === 'comfortable' ? 'text-base' : 'text-sm'
  }`;

/** Date and time sit at their natural width rather than filling the dialog. */
export const dueFieldClassName = 'w-auto';
