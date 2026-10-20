import { useCallback } from 'react';

import { toastUndoable } from '@/app/components/toast-undoable';
import { toastApiError } from '@/app/lib/toast-api-error';
import type { ConnectedEmailFolder } from '@/modules/email/api';
import {
  useArchiveEmailMessageMutation,
  useCachedEmailMessageLookup,
  useMoveEmailMessageMutation,
  useUnarchiveEmailMessageMutation,
} from '@/modules/email/hooks/email.hooks';
import {
  withElliotProposal,
  type ElliotProposalRef,
} from '@/modules/email/lib/email-action-source';
import { markEmailRowsLeaving, waitForEmailRowLeave } from '@/modules/email/lib/email-row-leaving';
import { useReducedMotion } from 'motion/react';

import { archiveToastCopy, archiveUndoSteps } from './agent-archive-undo';

/** Small batches: quick for a few dozen, gentle on the provider. */
const CONCURRENCY = 4;

async function inBatches<T>(items: readonly T[], run: (item: T) => Promise<unknown>) {
  for (let index = 0; index < items.length; index += CONCURRENCY) {
    await Promise.all(items.slice(index, index + CONCURRENCY).map(run));
  }
}

/**
 * Elliot's archive (elli-ui#651): no approval card and no countdown. The rows
 * fade out of the list, the archive runs, and a toast offers the way back.
 *
 * Resolves once the mail is archived and throws if it could not be, so the
 * caller can report either outcome on the card. `onUndoStart` runs when the
 * undo is taken, `onUndone` once it has put everything back.
 */
export function useAgentArchive(
  accountId: string | null | undefined,
  folders: ConnectedEmailFolder[]
) {
  const archiveMutation = useArchiveEmailMessageMutation();
  const unarchiveMutation = useUnarchiveEmailMessageMutation();
  const moveMutation = useMoveEmailMessageMutation();
  const cachedMessage = useCachedEmailMessageLookup();
  const reducedMotion = useReducedMotion() ?? false;

  return useCallback(
    async ({
      messageIds,
      proposal,
      onUndoStart,
      onUndone,
    }: {
      messageIds: readonly string[];
      proposal: ElliotProposalRef | null;
      onUndoStart: () => void;
      onUndone: () => void;
    }) => {
      if (!accountId) throw new Error('Connect a mailbox before running an action.');
      const inboxId = folders.find((folder) => folder.key === 'inbox')?.id;
      const archiveId = folders.find((folder) => folder.key === 'archive')?.id;
      // Read before the archive moves them: afterwards the cache says Archive.
      const listed = messageIds.map((messageId) => cachedMessage(accountId, messageId));
      const sourceFolderIds = new Map(
        messageIds.map((messageId, index) => [messageId, listed[index]?.folderId ?? null])
      );

      const release = markEmailRowsLeaving(messageIds);
      try {
        // Outside the proposal: anything written while the rows fade is not Elliot's.
        await waitForEmailRowLeave(reducedMotion);
        await withElliotProposal(proposal, () =>
          inBatches(messageIds, (messageId) =>
            archiveMutation.mutateAsync({
              accountId,
              messageId,
              targetFolderId: archiveId,
              silent: true,
            })
          )
        );
      } finally {
        // By now the archive has taken the rows out of the cache, or failed and
        // put them back; either way they should no longer be fading.
        release();
      }

      const undo = async () => {
        onUndoStart();
        const steps = archiveUndoSteps(messageIds, sourceFolderIds, { inboxId, archiveId });
        try {
          await inBatches(steps, (step) =>
            step.kind === 'move'
              ? moveMutation.mutateAsync({
                  accountId,
                  messageId: step.messageId,
                  folderId: step.folderId,
                  silent: true,
                })
              : unarchiveMutation.mutateAsync({
                  accountId,
                  messageId: step.messageId,
                  targetFolderId: inboxId,
                  silent: true,
                })
          );
          onUndone();
        } catch (error) {
          toastApiError(error, 'Could not move the email back.');
        }
      };

      const copy = archiveToastCopy(messageIds.length, listed[0]?.subject);
      toastUndoable({
        icon: 'archive',
        title: copy.title,
        description: copy.description,
        reversedLabel: copy.reversed,
        onUndo: () => void undo(),
      });
    },
    [
      accountId,
      archiveMutation,
      cachedMessage,
      folders,
      moveMutation,
      reducedMotion,
      unarchiveMutation,
    ]
  );
}
