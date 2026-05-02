import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { formatDateTime } from '@/app/lib/helpers';
import { useDownloadFile } from '@/modules/files/hooks/files.hooks';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Download } from 'lucide-react';

import { FileTypeIcon } from './file-type-icon';

interface FilesGridViewProps {
  data: FileItem[];
  onFolderClick?: (folder: FileItem) => void;
  onFilePreview?: (file: FileItem) => void;
}

export function FilesGridView({ data, onFolderClick, onFilePreview }: FilesGridViewProps) {
  const downloadFile = useDownloadFile();

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.map((item) => {
        const isFolder = item.type === 'FOLDER';

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
              <span className="text-xs text-muted-foreground">
                {formatDateTime(item.updatedAt || '')}
              </span>
              {!isFolder && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  onClick={(event) => {
                    event.stopPropagation();
                    downloadFile.mutate(item);
                  }}
                  aria-label="Download file"
                >
                  <Download className="size-3.5" />
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
