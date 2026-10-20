import { getFileFormatLabel, getFileFormatTone, type FileFormatTone } from '@/app/lib/file-format';
import { cn } from '@/app/lib/utils';

/**
 * A file, named by its own format (elli-ui#1042).
 *
 * A tinted outline glyph told you a file was "a document" and left you reading
 * the extension off the end of the filename to learn anything more. The badge
 * says `PDF` or `DWG` outright, on a fill that is the same colour every time
 * for that format — so a list of attachments is scannable by shape and colour
 * before any of the names are read.
 *
 * The tones are deliberately **theme-independent**: a PDF is the same red in
 * all four themes, the way a file-type colour works everywhere else. They are
 * still tokens (`--file-format-*`, defined in every theme file) rather than
 * literals in here.
 *
 * Shared rather than mailbox-local because the Files module wants the same
 * badge — that is what #1045 asks for.
 */
export function FileFormatBadge({
  fileName,
  mimeType,
  className,
  labelClassName,
}: {
  fileName: string | null | undefined;
  mimeType?: string | null;
  className?: string;
  labelClassName?: string;
}) {
  const label = getFileFormatLabel(fileName, mimeType);
  const tone = getFileFormatTone(fileName, mimeType);

  return (
    <span
      aria-hidden="true"
      className={cn(
        '@container relative inline-flex size-8 shrink-0 items-center justify-center',
        className
      )}
    >
      {/*
        The shape is a SIM card: the top-right corner is cut off the outline
        itself, with the cut's two joints softened. A pale triangle painted over
        a rounded square left the silhouette a square, so at 24px it read as a
        colour swatch with a smudge rather than a file.
      */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={cn('absolute inset-0 size-full', TONE_FILL[tone])}
      >
        <path d={SIM_PATH} />
      </svg>
      {/*
        The label is sized in `cqw` off the badge itself, so one component
        serves the 24px mark in an attachment row and the 64px tile in the
        Files grid without either call site passing a font size (elli-ui#1045).
        26cqw lands on ~8px at size-6 and ~17px at size-16, which is the same
        optical weight at both ends. The `translate-y` drops it into the body
        below the cut; it sits on the label, not the badge, because `cqw` on
        the badge itself would measure an ancestor (or the viewport) instead.
        Below 20px the letters would be ~5px of noise, so the label drops out
        and the coloured silhouette alone carries the format (elli-ui#1444) —
        those are inline marks beside a filename that spells the extension.
      */}
      <span
        className={cn(
          'relative translate-y-[6cqw] px-[6cqw] text-[26cqw] font-bold uppercase leading-none tracking-tight text-file-format-foreground @max-[1.25rem]:hidden',
          labelClassName
        )}
      >
        {label}
      </span>
    </span>
  );
}

/**
 * A 100×100 square: 12% corner radius, the top-right corner cut 30% down each
 * edge, and both joints of the cut rounded with an 8-unit curve.
 */
const SIM_PATH =
  'M12 0H62Q70 0 75.66 5.66L94.34 24.34Q100 30 100 38V88Q100 100 88 100H12Q0 100 0 88V12Q0 0 12 0Z';

/**
 * Spelled out rather than interpolated: Tailwind scans source text for class
 * names, and `fill-file-format-${tone}` is not one it can find.
 */
const TONE_FILL: Record<FileFormatTone, string> = {
  red: 'fill-file-format-red',
  green: 'fill-file-format-green',
  blue: 'fill-file-format-blue',
  cyan: 'fill-file-format-cyan',
  violet: 'fill-file-format-violet',
  amber: 'fill-file-format-amber',
  navy: 'fill-file-format-navy',
  slate: 'fill-file-format-slate',
};
