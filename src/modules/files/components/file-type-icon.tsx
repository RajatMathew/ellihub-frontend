import { FileFormatBadge } from '@/app/components/file-format-badge';
import { cn } from '@/app/lib/utils';
import { FolderIcon, type LucideProps } from 'lucide-react';

interface FileTypeIconProps extends LucideProps {
  mimeType?: string | null;
  fileName?: string | null;
  fileType: 'FILE' | 'FOLDER';
  /** Folders only — a file is always the format badge. */
  presentation?: 'icon' | 'badge';
  iconClassName?: string;
}

export function FileTypeIcon({
  mimeType,
  fileName,
  fileType,
  presentation = 'icon',
  className,
  iconClassName,
  ...props
}: FileTypeIconProps) {
  if (fileType === 'FOLDER') {
    if (presentation === 'badge') {
      return (
        <span
          className={cn(
            'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50',
            className
          )}
        >
          <FolderIcon className={cn('size-5 text-amber-600', iconClassName)} {...props} />
        </span>
      );
    }

    return <FolderIcon className={cn('text-warning', className)} {...props} />;
  }

  // A file is always the shared SIM-card `FileFormatBadge` (elli-ui#1045,
  // #1444): it names the format instead of implying a family with a tinted
  // glyph, and it is the same mark the mailbox draws on an attachment, so a
  // file looks the same wherever it is listed — a 16px row icon included. The
  // badge drops its label below ~20px on its own, leaving the coloured shape.
  return <FileFormatBadge fileName={fileName} mimeType={mimeType} className={className} />;
}
