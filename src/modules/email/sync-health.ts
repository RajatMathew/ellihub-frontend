import { EmailSyncStatus, type EmailAccount, type EmailSyncState } from '@db/client';

const EMAIL_FRESHNESS_WINDOW_MS = 2 * 60 * 1000;

export type EmailFreshnessState = 'fresh' | 'stale' | 'syncing' | 'error';

export type EmailFreshness = {
    state: EmailFreshnessState;
    lastSyncedAt: string | null;
    staleSince: string | null;
    reason: string | null;
    errorCode: string | null;
    syncing: boolean;
};

export const toEmailFreshness = (
    account: Pick<EmailAccount, 'lastSyncedAt'>,
    syncState?: EmailSyncState | null,
    now = Date.now()
): EmailFreshness => {
    const lastSyncedAt = syncState?.lastCompletedAt || account.lastSyncedAt;
    const syncing =
        syncState?.lastSyncStatus === EmailSyncStatus.SYNCING ||
        syncState?.lastSyncStatus === EmailSyncStatus.PARTIAL;
    const stale = !lastSyncedAt || now - lastSyncedAt.getTime() > EMAIL_FRESHNESS_WINDOW_MS;
    const failed = syncState?.lastSyncStatus === EmailSyncStatus.ERROR;
    const state: EmailFreshnessState = syncing
        ? 'syncing'
        : failed && !lastSyncedAt
          ? 'error'
          : failed || stale
            ? 'stale'
            : 'fresh';

    return {
        state,
        lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
        staleSince: stale && lastSyncedAt ? lastSyncedAt.toISOString() : null,
        reason: failed
            ? 'The latest provider refresh failed. Cached email is still available.'
            : null,
        errorCode: failed ? syncState?.lastSyncErrorCode || 'EMAIL_SYNC_FAILED' : null,
        syncing,
    };
};
