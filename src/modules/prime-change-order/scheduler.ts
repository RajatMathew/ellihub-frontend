import { PrimeChangeOrderService } from './service';

export const primeChangeOrderSchedules = [
    {
        name: 'sync-fieldwire-prime-change-orders',
        cron: '30 0 * * *',
        run: async () => {
            await PrimeChangeOrderService.syncMappedActiveProjects({
                trigger: 'SCHEDULED',
                recordGlobalRun: true,
            });
        },
    },
];
