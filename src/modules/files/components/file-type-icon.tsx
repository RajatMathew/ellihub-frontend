import { cn } from '@/app/lib/utils';
import {
  FileAudio,
  FileCode,
  FileIcon,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderIcon,
  Image as ImageIcon,
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
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)
  ) {
    return { Icon: ImageIcon, color: 'text-success' };
  }

  if (mime?.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return { Icon: FileVideo, color: 'text-info' };
  }

  if (mime?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
    return { Icon: FileAudio, color: 'text-primary' };
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    return { Icon: FileText, color: 'text-destructive' };
  }

  if (
    ['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext) ||
    mime?.includes('wordprocessing') ||
    mime?.includes('msword') ||
    mime?.startsWith('text/')
  ) {
    return { Icon: FileText, color: 'text-info' };
  }

  if (
    ['xls', 'xlsx', 'csv', 'ods'].includes(ext) ||
    mime?.includes('spreadsheet') ||
    mime?.includes('excel')
  ) {
    return { Icon: FileSpreadsheet, color: 'text-success' };
  }

  if (
    ['ppt', 'pptx', 'odp'].includes(ext) ||
    mime?.includes('presentation') ||
    mime?.includes('powerpoint')
  ) {
    return { Icon: FileText, color: 'text-warning' };
  }

  if (
    ['json', 'xml', 'html', 'css', 'ts', 'tsx', 'jsx', 'py', 'java', 'yml', 'yaml', 'sql'].includes(
      ext
    ) ||
    mime?.includes('json') ||
    mime?.includes('xml')
  ) {
    return { Icon: FileCode, color: 'text-muted-foreground' };
  }

  if (
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext) ||
    mime?.includes('zip') ||
    mime?.includes('compressed')
  ) {
    return { Icon: FileIcon, color: 'text-warning' };
  }

  return { Icon: FileIcon, color: 'text-info' };
}

interface FileTypeIconProps extends LucideProps {
  mimeType?: string | null;
  fileName?: string | null;
  fileType: 'FILE' | 'FOLDER';
}

export function FileTypeIcon({
  mimeType,
  fileName,
  fileType,
  className,
  ...props
}: FileTypeIconProps) {
  if (fileType === 'FOLDER') {
    return <FolderIcon className={cn('text-warning', className)} {...props} />;
  }

  const { Icon, color } = resolveIcon(mimeType, fileName);
  return <Icon className={cn(color, className)} {...props} />;
}
