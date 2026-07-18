import { EmailSyncStatus, type EmailSyncState } from '@db/client';
import { describe, expect, test } from 'bun:test';

import { toEmailFreshness } from './sync-health';

const NOW = new Date('2026-07-15T12:00:00.000Z');

const syncState = (overrides: Partial<EmailSyncState>): EmailSyncState =>
    ({
        id: 'sync-1',
        accountId: 'account-1',
        syncUpdatedToken: null,
        syncUpdatedPageToken: null,
        syncUpdatedNextToken: null,
        syncDeletedToken: null,
        syncDeletedPageToken: null,
        syncDeletedNextToken: null,
        lastSyncStatus: EmailSyncStatus.IDLE,
        lastSyncError: null,
        lastSyncErrorCode: null,
        consecutiveFailures: 0,
        lastStartedAt: null,
        lastCompletedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    }) as EmailSyncState;

describe('email cache freshness', () => {
    test('reports a recent completed sync as fresh', () => {
        const freshness = toEmailFreshness(
            { lastSyncedAt: NOW },
            syncState({
                lastSyncStatus: EmailSyncStatus.READY,
                lastCompletedAt: new Date(NOW.getTime() - 30_000),
            }),
            NOW.getTime()
        );

        expect(freshness.state).toBe('fresh');
        expect(freshness.syncing).toBe(false);
    });

    test('keeps cached data available after a failed refresh', () => {
        const freshness = toEmailFreshness(
            { lastSyncedAt: NOW },
            syncState({
                lastSyncStatus: EmailSyncStatus.ERROR,
                lastCompletedAt: new Date(NOW.getTime() - 10 * 60_000),
                lastSyncErrorCode: 'EMAIL_PROVIDER_CONNECTION',
            }),
            NOW.getTime()
        );

        expect(freshness.state).toBe('stale');
        expect(freshness.errorCode).toBe('EMAIL_PROVIDER_CONNECTION');
        expect(freshness.lastSyncedAt).not.toBeNull();
    });

    test('reports an initial failed sync without cache as an error', () => {
        const freshness = toEmailFreshness(
            { lastSyncedAt: null },
            syncState({ lastSyncStatus: EmailSyncStatus.ERROR }),
            NOW.getTime()
        );

        expect(freshness.state).toBe('error');
        expect(freshness.lastSyncedAt).toBeNull();
    });

    test('reports resumable work as syncing', () => {
        const freshness = toEmailFreshness(
            { lastSyncedAt: NOW },
            syncState({ lastSyncStatus: EmailSyncStatus.PARTIAL }),
            NOW.getTime()
        );

        expect(freshness.state).toBe('syncing');
        expect(freshness.syncing).toBe(true);
    });
});
