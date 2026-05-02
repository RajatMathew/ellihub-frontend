import { useMemo } from 'react';

import { useFolderDetailQuery, useRootFolderQuery } from '@/modules/files/hooks/files.hooks';
import type { FileItem } from '@/modules/files/schemas/file.schema';

export function useFilesFolderData(folderId: string | undefined) {
  const { data: rootFolder, isLoading: isRootLoading, isError: isRootError } = useRootFolderQuery();

  const rootId = rootFolder?.id ?? '';
  const currentFolderId = folderId ?? rootId;

  const {
    data: folderDetail,
    isLoading: isFolderLoading,
    isError: isFolderError,
    refetch,
  } = useFolderDetailQuery(currentFolderId);

  const allChildren = useMemo<FileItem[]>(
    () => folderDetail?.children ?? [],
    [folderDetail?.children]
  );

  return {
    rootFolder,
    currentFolderId,
    folderDetail,
    allChildren,
    isLoading: isRootLoading || (!!currentFolderId && isFolderLoading),
    isError: isRootError || isFolderError,
    refetch,
  };
}
