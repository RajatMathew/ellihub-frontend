import { FileFormatBadge } from '@/app/components/file-format-badge';
import { cn } from '@/app/lib/utils';
import {
  FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileVideo,
  FolderIcon,
  type LucideProps,
} from 'lucide-react';

function getExtension(name: string | null | undefined): string {
  if (!name) return '';
  const dotIdx = name.lastIndexOf('.');
  return dotIdx > 0 ? name.slice(dotIdx + 1).toLowerCase() : '';
}

function resolveIcon(mime: string | null | undefined, name: string | null | undefined) {
  const ext = getExtension(name);

  if (
    mime?.startsWith('image/') ||
    ['heic', 'heif', 'jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp'].includes(ext)
  ) {
    return { Icon: FileImage, color: 'text-emerald-600' };
  }

  if (mime?.startsWith('video/') || ['m4v', 'mov', 'mp4', 'webm'].includes(ext)) {
    return { Icon: FileVideo, color: 'text-amber-600' };
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    return { Icon: FileText, color: 'text-rose-600' };
  }

  if (
    ['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext) ||
    mime?.includes('wordprocessing') ||
    mime?.includes('msword') ||
    mime?.startsWith('text/')
  ) {
    return { Icon: FileType2, color: 'text-sky-600' };
  }

  if (
    ['xls', 'xlsx', 'csv', 'ods'].includes(ext) ||
    mime?.includes('spreadsheet') ||
    mime?.includes('excel')
  ) {
    return { Icon: FileSpreadsheet, color: 'text-emerald-600' };
  }

  return { Icon: FileIcon, color: 'text-sky-600' };
}

interface FileTypeIconProps extends LucideProps {
  mimeType?: string | null;
  fileName?: string | null;
  fileType: 'FILE' | 'FOLDER';
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

  // The badge presentation is the shared `FileFormatBadge` (elli-ui#1045): it
  // names the format instead of implying a family with a tinted glyph, and it
  // is the same badge the mailbox draws on an attachment, so a file looks the
  // same wherever it is listed.
  //
  // `presentation="icon"` deliberately keeps the outline glyph. The badge
  // carries three or four letters and stops being readable much below 24px,
  // and most icon call sites here are 14–16px inline marks beside a filename
  // that already spells the extension out.
  if (presentation === 'badge') {
    return <FileFormatBadge fileName={fileName} mimeType={mimeType} className={className} />;
  }

  const { Icon, color } = resolveIcon(mimeType, fileName);

  return <Icon className={cn(color, className)} {...props} />;
}
