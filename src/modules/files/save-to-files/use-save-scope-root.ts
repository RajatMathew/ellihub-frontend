/* eslint-disable react-hooks/set-state-in-effect -- going back to the first project when the dialog opens is dialog lifecycle, not external synchronization */

import { useEffect, useState } from 'react';

import { filesKeys } from '@/modules/files/constants/files.keys';
import { useProjectRootFolderQuery } from '@/modules/files/hooks/files.hooks';
import {
  labelForShownRoot,
  type SaveToFilesScope,
} from '@/modules/files/save-to-files/save-scopes';
import { useQueryClient } from '@tanstack/react-query';

interface UseSaveScopeRootOptions {
  scopes?: readonly SaveToFilesScope[];
  /** The caller's root — for an email, the first project's folder, already looked up. */
  rootFolderId?: string;
  rootLabel: string;
  open: boolean;
}

/**
 * The folder the picker browses from, when the save can go under one of
 * several projects (elli-ui#1067).
 *
 * Without scopes this is the caller's root and label, unchanged. With them the
 * first project starts selected, and picking another looks its folder up and
 * moves the root there once it arrives.
 */
export function useSaveScopeRoot({
  scopes,
  rootFolderId,
  rootLabel,
  open,
}: UseSaveScopeRootOptions) {
  const queryClient = useQueryClient();
  const hasScopes = !!scopes && scopes.length > 0;
  const firstId = scopes?.[0]?.id;
  const [selectedId, setSelectedId] = useState(firstId);

  useEffect(() => {
    if (open) setSelectedId(firstId);
  }, [firstId, open]);

  const folderQuery = useProjectRootFolderQuery(hasScopes ? selectedId : undefined, open);
  const shownRootFolderId = hasScopes ? (folderQuery.data ?? rootFolderId) : rootFolderId;
  const waiting = folderQuery.isFetching && (folderQuery.isPlaceholderData || !folderQuery.data);

  return {
    selectedId,
    select: setSelectedId,
    rootFolderId: shownRootFolderId,
    rootLabel: hasScopes
      ? labelForShownRoot(
          scopes,
          shownRootFolderId,
          (scopeId) => queryClient.getQueryData<string>(filesKeys.projectFolder(scopeId)),
          rootLabel
        )
      : rootLabel,
    loadingId: waiting ? selectedId : undefined,
    failedLabel:
      hasScopes && folderQuery.isError
        ? scopes.find((scope) => scope.id === selectedId)?.label
        : undefined,
  };
}
