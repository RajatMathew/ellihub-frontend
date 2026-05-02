import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb';
import type { FolderPathEntry } from '@/modules/files/hooks/use-files-list-params';
import { Home } from 'lucide-react';

interface FilesBreadcrumbsProps {
  folderPath: FolderPathEntry[];
  rootLabel?: string;
  onBreadcrumbClick: (index: number) => void;
}

export function FilesBreadcrumbs({
  folderPath,
  rootLabel = 'Files',
  onBreadcrumbClick,
}: FilesBreadcrumbsProps) {
  if (folderPath.length === 0) return null;

  return (
    <Breadcrumb className="mb-4 overflow-x-auto">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem>
          <BreadcrumbLink
            className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap"
            onClick={() => onBreadcrumbClick(-1)}
          >
            <Home className="size-3.5" />
            {rootLabel}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {folderPath.map((entry, index) => (
          <span key={entry.id} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === folderPath.length - 1 ? (
                <BreadcrumbPage className="max-w-52 truncate sm:max-w-xs">
                  {entry.name}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  className="max-w-40 cursor-pointer truncate sm:max-w-52"
                  onClick={() => onBreadcrumbClick(index)}
                >
                  {entry.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
