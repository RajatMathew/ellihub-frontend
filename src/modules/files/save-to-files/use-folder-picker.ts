/* eslint-disable react-hooks/set-state-in-effect -- resetting navigation when the picker opens is dialog lifecycle, not external synchronization */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { FilesBreadcrumbEntry } from '@/modules/files/components/files-breadcrumbs';
import { useFolderDetailQuery, useRootFolderQuery } from '@/modules/files/hooks/files.hooks';
import { canUploadTo, splitFolderContents } from '@/modules/files/save-to-files/folder-contents';
import {
  getRecentFoldersScope,
  pushRecentFolder,
  readRecentFolders,
  type RecentFolder,
} from '@/modules/files/save-to-files/recent-folders';
import type { FileItem } from '@/modules/files/schemas/file.schema';

export interface UseFolderPickerOptions {
  /** Only browse inside this folder. Omit to browse from the user's root. */
  rootFolderId?: string;
  rootLabel?: string;
  /** Folder to land on when the picker opens. */
  defaultFolderId?: string;
  /** Queries stay idle until the picker is actually open. */
  open: boolean;
}

function canCreateFolderIn(folder: Pick<FileItem, 'capabilities'> | undefined): boolean {
  return folder?.capabilities?.createFolder !== false;
}

function getScopedBreadcrumbs(
  breadcrumbs: FilesBreadcrumbEntry[] | undefined,
  rootId: string | undefined
): FilesBreadcrumbEntry[] {
  if (!breadcrumbs?.length) return [];

  const rootIndex = rootId ? breadcrumbs.findIndex((entry) => entry.id === rootId) : -1;

  return rootIndex >= 0 ? breadcrumbs.slice(rootIndex + 1) : breadcrumbs.slice(1);
}

export function useFolderPicker({
  rootFolderId,
  rootLabel = 'Files',
  defaultFolderId,
  open,
}: UseFolderPickerOptions) {
  const rootQuery = useRootFolderQuery(open && !rootFolderId);
  const resolvedRootId = rootFolderId ?? rootQuery.data?.id;
  const scope = getRecentFoldersScope(rootFolderId);

  const [requestedFolderId, setRequestedFolderId] = useState<string | undefined>(
    defaultFolderId ?? rootFolderId
  );
  const [filter, setFilter] = useState('');
  const [showRestricted, setShowRestricted] = useState(false);
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);

  useEffect(() => {
    if (!open) return;

    setRequestedFolderId(defaultFolderId ?? rootFolderId);
    setFilter('');
    setShowRestricted(false);
    setRecentFolders(readRecentFolders(scope));
  }, [defaultFolderId, open, rootFolderId, scope]);

  const currentFolderId = requestedFolderId ?? resolvedRootId;
  const folderQuery = useFolderDetailQuery(currentFolderId, open);
  const folderDetail = folderQuery.data;

  /**
   * Folders, restricted folders and files, from one pass over the children
   * (elli-ui#1066). The split is a pure function so the rules — what counts as
   * restricted, what the filter narrows — are testable without a renderer.
   */
  const { folders, restrictedFolders, files } = useMemo(
    () => splitFolderContents(folderDetail?.children, filter),
    [filter, folderDetail?.children]
  );

  const breadcrumbs = useMemo(
    () => getScopedBreadcrumbs(folderDetail?.breadcrumbs, resolvedRootId),
    [folderDetail?.breadcrumbs, resolvedRootId]
  );

  const currentFolderName = useMemo(() => {
    const name = folderDetail?.displayName || folderDetail?.name;
    if (!name || name.trim().toLowerCase() === 'root') return rootLabel;

    return name;
  }, [folderDetail?.displayName, folderDetail?.name, rootLabel]);

  const navigateTo = useCallback(
    (folderId?: string) => {
      setFilter('');
      setShowRestricted(false);
      setRequestedFolderId(folderId ?? resolvedRootId);
    },
    [resolvedRootId]
  );

  const goUp = useCallback(() => {
    const parentId = breadcrumbs.at(-2)?.id ?? resolvedRootId;
    navigateTo(parentId);
  }, [breadcrumbs, navigateTo, resolvedRootId]);

  const rememberCurrentFolder = useCallback(() => {
    if (!currentFolderId) return;

    setRecentFolders(pushRecentFolder(scope, { id: currentFolderId, name: currentFolderName }));
  }, [currentFolderId, currentFolderName, scope]);

  return {
    currentFolderId,
    currentFolderName,
    rootFolderId: resolvedRootId,
    rootLabel,
    folderDetail,
    folders,
    files,
    restrictedFolders,
    breadcrumbs,
    filter,
    setFilter,
    showRestricted,
    setShowRestricted,
    recentFolders,
    rememberCurrentFolder,
    navigateTo,
    goUp,
    canSaveHere: canUploadTo(folderDetail),
    canCreateFolderHere: canCreateFolderIn(folderDetail),
    isAtRoot: breadcrumbs.length === 0,
    isLoading: folderQuery.isLoading || (!rootFolderId && rootQuery.isLoading),
    isError: folderQuery.isError || (!rootFolderId && rootQuery.isError),
    refetch: () => {
      void folderQuery.refetch();
      if (!rootFolderId) void rootQuery.refetch();
    },
  };
}

export type FolderPicker = ReturnType<typeof useFolderPicker>;
