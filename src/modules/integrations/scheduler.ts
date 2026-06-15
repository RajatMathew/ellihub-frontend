import { QuickBooksReferenceSyncService } from './reference-sync-service';

export const integrationSchedules = [
    {
        name: 'sync-quickbooks-reference-data',
        cron: '45 0 * * *',
        run: async () => {
            await QuickBooksReferenceSyncService.syncReferenceData({
                trigger: 'SCHEDULED',
                requireAutoEnabled: true,
            });
        },
    },
];
