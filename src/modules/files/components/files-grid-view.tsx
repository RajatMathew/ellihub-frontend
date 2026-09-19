import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { formatDateTime } from '@/app/lib/helpers';
import { useDownloadFile } from '@/modules/files/hooks/files.hooks';
import { getFileDisplayNameWithExtension } from '@/modules/files/lib/file-display-name';
import { getBlockingFileLinks } from '@/modules/files/lib/file-links';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Download, FolderTree, Pin, Star, StarOff } from 'lucide-react';
import { motion } from 'motion/react';

import { FileLinkBadge } from './file-link-badge';
import { getFileLocationLabel } from './file-location';
import { FileTypeIcon } from './file-type-icon';

interface FilesGridViewProps {
  data: FileItem[];
  showLocation?: boolean;
  locationRootId?: string;
  locationRootLabel?: string;
  onFolderClick?: (folder: FileItem) => void;
  onFilePreview?: (file: FileItem) => void;
  onFolderExport?: (folder: FileItem) => void;
  canExport?: boolean;
  onPinPrimeContract?: (file: FileItem) => void;
  canPinPrimeContract?: (file: FileItem) => boolean;
  onSetPrimeContractPrimary?: (file: FileItem, isPrimary: boolean) => void;
  canSetPrimeContractPrimary?: (file: FileItem) => boolean;
}

export function FilesGridView({
  data,
  showLocation = false,
  locationRootId,
  locationRootLabel,
  onFolderClick,
  onFilePreview,
  onFolderExport,
  canExport = true,
  onPinPrimeContract,
  canPinPrimeContract,
  onSetPrimeContractPrimary,
  canSetPrimeContractPrimary,
}: FilesGridViewProps) {
  const downloadFile = useDownloadFile();

  if (data.length === 0) return null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {data.map((item) => {
        const isFolder = item.type === 'FOLDER';
        const location = showLocation
          ? getFileLocationLabel(item, {
              rootId: locationRootId,
              rootLabel: locationRootLabel,
            })
          : undefined;
        const canPin = canPinPrimeContract?.(item) ?? false;
        const canSetPrimary = canSetPrimeContractPrimary?.(item) ?? false;
        const isPrimary = item.primeContract?.isPrimary === true;
        const canExportFolder = isFolder && canExport;
        const hasLinks = getBlockingFileLinks(item).length > 0;
        const showActions = canPin || canSetPrimary || !isFolder || canExportFolder;
        const itemName = getFileDisplayNameWithExtension(item);

        return (
          <motion.div
            key={item.id}
            layout="position"
            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <Card className="group min-w-0 overflow-hidden transition-colors hover:border-primary/30">
              <CardContent className="flex min-w-0 flex-col items-center gap-3 p-4 sm:p-5">
                <button
                  type="button"
                  className="flex w-full min-w-0 flex-col items-center gap-3 rounded-md text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => {
                    if (isFolder) onFolderClick?.(item);
                    if (!isFolder) onFilePreview?.(item);
                  }}
                  aria-label={`${isFolder ? 'Open folder' : 'Preview file'} ${itemName}`}
                >
                  <span className="flex size-16 items-center justify-center rounded-lg bg-muted/30">
                    <FileTypeIcon
                      fileType={item.type}
                      mimeType={item.mimeType}
                      fileName={itemName}
                      presentation={item.type === 'FILE' ? 'badge' : 'icon'}
                      className={item.type === 'FILE' ? 'size-9 rounded-md' : 'size-8'}
                    />
                  </span>
                  <span
                    className="line-clamp-2 w-full min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]"
                    title={itemName}
                  >
                    {itemName}
                  </span>
                  {(item.primeContract?.isPinned || item.primeContract?.isPrimary || hasLinks) && (
                    <span className="flex max-w-full flex-wrap justify-center gap-1">
                      {item.primeContract?.isPinned && (
                        <Badge variant="secondary" appearance="light" size="sm">
                          Pinned
                        </Badge>
                      )}
                      {item.primeContract?.isPrimary && (
                        <Badge variant="primary" appearance="light" size="sm">
                          Primary
                        </Badge>
                      )}
                      <FileLinkBadge file={item} />
                    </span>
                  )}
                  {location && (
                    <span
                      className="flex w-full min-w-0 items-center justify-center gap-1 text-xs text-muted-foreground"
                      title={location}
                    >
                      <FolderTree className="size-3 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{location}</span>
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.updatedAt || '')}
                  </span>
                </button>

                {showActions && (
                  <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
                    {canPin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0"
                        onClick={() => onPinPrimeContract?.(item)}
                        aria-label="Pin to overview"
                      >
                        <Pin className="size-3.5" />
                      </Button>
                    )}
                    {canSetPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0"
                        onClick={() => onSetPrimeContractPrimary?.(item, !isPrimary)}
                        aria-label={isPrimary ? 'Remove primary mark' : 'Mark primary'}
                      >
                        {isPrimary ? (
                          <StarOff className="size-3.5" />
                        ) : (
                          <Star className="size-3.5" />
                        )}
                      </Button>
                    )}
                    {(!isFolder || canExportFolder) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0"
                        onClick={() => {
                          if (isFolder) {
                            onFolderExport?.(item);
                            return;
                          }
                          downloadFile.mutate(item);
                        }}
                        aria-label={isFolder ? 'Export folder as ZIP' : 'Download file'}
                      >
                        <Download className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
