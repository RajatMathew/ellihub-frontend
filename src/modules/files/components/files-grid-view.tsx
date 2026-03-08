import { Download } from 'lucide-react';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { Card, CardContent } from '@app/components/ui/card';

import type { FileItem } from '@modules/files/schemas/file.schema';

import { FileTypeIcon } from './file-type-icon';
import { useDownloadFile } from '../hooks/files.hooks';

interface FilesGridViewProps {
  data: FileItem[];
  onFolderClick?: (folder: FileItem) => void;
  onFilePreview?: (file: FileItem) => void;
}

export function FilesGridView({ data, onFolderClick, onFilePreview }: FilesGridViewProps) {
  const downloadFile = useDownloadFile();

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
      {data.map((item) => {
        const isFolder = item.type === 'FOLDER';
        return (
          <Card
            key={item.id}
            className="group cursor-pointer transition-colors hover:border-primary/30"
            onClick={() => {
              if (isFolder && onFolderClick) onFolderClick(item);
              if (!isFolder && onFilePreview) onFilePreview(item);
            }}
          >
            <CardContent className="flex flex-col items-center gap-3 p-5">
              <div className="flex items-center justify-center size-16 rounded-lg bg-muted/30">
                <FileTypeIcon
                  fileType={item.type}
                  mimeType={item.mimeType}
                  fileName={item.name}
                  className="size-8"
                />
              </div>
              <span className="text-sm font-medium text-foreground text-center line-clamp-2 w-full">
                {item.name}
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant={isFolder ? 'warning' : 'info'}
                  appearance="light"
                  size="sm"
                >
                  {isFolder ? 'Folder' : 'File'}
                </Badge>
                {!isFolder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile.mutate(item.id);
                    }}
                  >
                    <Download className="size-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
