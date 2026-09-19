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
        'relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md',
        TONE_BACKGROUND[tone],
        className
      )}
    >
      {/* The folded corner. Decorative, and the only thing that separates the
          badge from a plain colour swatch at this size. */}
      <span className="absolute right-0 top-0 h-1/3 w-1/3 bg-file-format-foreground/25 [clip-path:polygon(0_0,100%_0,100%_100%)]" />
      <span
        className={cn(
          'px-0.5 text-[9px] font-bold uppercase leading-none tracking-tight text-file-format-foreground',
          labelClassName
        )}
      >
        {label}
      </span>
    </span>
  );
}

/**
 * Spelled out rather than interpolated: Tailwind scans source text for class
 * names, and `bg-file-format-${tone}` is not one it can find.
 */
const TONE_BACKGROUND: Record<FileFormatTone, string> = {
  red: 'bg-file-format-red',
  green: 'bg-file-format-green',
  blue: 'bg-file-format-blue',
  cyan: 'bg-file-format-cyan',
  violet: 'bg-file-format-violet',
  amber: 'bg-file-format-amber',
  navy: 'bg-file-format-navy',
  slate: 'bg-file-format-slate',
};
