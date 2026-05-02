import { useMemo } from 'react';

import { useFolderDetailQuery, useRootFolderQuery } from '@/modules/files/hooks/files.hooks';
import type { FileItem } from '@/modules/files/schemas/file.schema';

export function useFilesFolderData(folderId: string | undefined, rootFolderId?: string) {
  const shouldLoadGlobalRoot = !rootFolderId;
  const {
    data: rootFolder,
    isLoading: isRootLoading,
    isError: isRootError,
  } = useRootFolderQuery(shouldLoadGlobalRoot);

  const rootId = rootFolderId ?? rootFolder?.id ?? '';
  const currentFolderId = folderId ?? rootId;

  const {
    data: folderDetail,
    isLoading: isFolderLoading,
    isError: isFolderError,
    refetch,
  } = useFolderDetailQuery(currentFolderId, !!currentFolderId);

  const allChildren = useMemo<FileItem[]>(
    () => folderDetail?.children ?? [],
    [folderDetail?.children]
  );

  return {
    rootFolder,
    currentFolderId,
    folderDetail,
    allChildren,
    isLoading: (shouldLoadGlobalRoot && isRootLoading) || (!!currentFolderId && isFolderLoading),
    isError: (shouldLoadGlobalRoot && isRootError) || isFolderError,
    refetch,
  };
}
