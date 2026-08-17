import { Badge } from '@/app/components/ui/badge';
import {
  describeFileLinks,
  getBlockingFileLinks,
  getFileLinkBadgeLabel,
} from '@/modules/files/lib/file-links';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Paperclip } from 'lucide-react';

interface FileLinkBadgeProps {
  file: Pick<FileItem, 'links'>;
}

/**
 * Marks a file that an RFQ, purchase order, vendor or similar record still
 * points at. Such a file cannot be deleted from Files, so saying what holds it
 * explains why the delete action is missing.
 */
export function FileLinkBadge({ file }: FileLinkBadgeProps) {
  const links = getBlockingFileLinks(file);
  const label = getFileLinkBadgeLabel(links);

  if (!label) return null;

  return (
    <Badge
      variant="secondary"
      appearance="light"
      size="sm"
      title={`Attached to ${describeFileLinks(links)}`}
    >
      <Paperclip className="size-3" />
      <span className="min-w-0 truncate">{label}</span>
    </Badge>
  );
}
