import type { FileItem } from '@/modules/files/schemas/file.schema';

interface FileLocationOptions {
  rootId?: string;
  rootLabel?: string;
}

export function getFileLocationLabel(
  item: FileItem,
  { rootId, rootLabel }: FileLocationOptions = {}
): string | undefined {
  if (!item.breadcrumbs?.length) return undefined;

  const parentPath = item.type === 'FOLDER' ? item.breadcrumbs.slice(0, -1) : item.breadcrumbs;
  const rootIndex = rootId ? parentPath.findIndex((entry) => entry.id === rootId) : -1;
  const scopedPath = rootIndex >= 0 ? parentPath.slice(rootIndex + 1) : parentPath;
  const labels = scopedPath.map((entry) => entry.name).filter(Boolean);

  if (rootLabel && rootId) {
    return [rootLabel, ...labels].join(' / ');
  }

  return labels.length > 0 ? labels.join(' / ') : rootLabel;
}
