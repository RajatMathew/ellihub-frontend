import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { formatDateTime } from '@/app/lib/helpers';
import { useDownloadFile } from '@/modules/files/hooks/files.hooks';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Download, FolderTree, Pin, Star, StarOff } from 'lucide-react';

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
  onPinPrimeContract,
  canPinPrimeContract,
  onSetPrimeContractPrimary,
  canSetPrimeContractPrimary,
}: FilesGridViewProps) {
  const downloadFile = useDownloadFile();

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

        return (
          <Card
            key={item.id}
            className="group cursor-pointer transition-colors hover:border-primary/30"
            onClick={() => {
              if (isFolder) onFolderClick?.(item);
              if (!isFolder) onFilePreview?.(item);
            }}
          >
            <CardContent className="flex flex-col items-center gap-3 p-5">
              <div className="flex size-16 items-center justify-center rounded-lg bg-muted/30">
                <FileTypeIcon
                  fileType={item.type}
                  mimeType={item.mimeType}
                  fileName={item.displayName || item.name}
                  className="size-8"
                />
              </div>
              <span className="line-clamp-2 w-full text-center text-sm font-medium text-foreground">
                {item.displayName || item.name}
              </span>
              {(item.primeContract?.isPinned || item.primeContract?.isPrimary) && (
                <div className="flex flex-wrap justify-center gap-1">
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
                </div>
              )}
              {location && (
                <span
                  className="flex w-full min-w-0 items-center justify-center gap-1 text-xs text-muted-foreground"
                  title={location}
                >
                  <FolderTree className="size-3 shrink-0" />
                  <span className="truncate">{location}</span>
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDateTime(item.updatedAt || '')}
              </span>
              <div className="flex items-center gap-1">
                {canPin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPinPrimeContract?.(item);
                    }}
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
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetPrimeContractPrimary?.(item, !isPrimary);
                    }}
                    aria-label={isPrimary ? 'Remove primary mark' : 'Mark primary'}
                  >
                    {isPrimary ? (
                      <StarOff className="size-3.5" />
                    ) : (
                      <Star className="size-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  onClick={(event) => {
                    event.stopPropagation();
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
