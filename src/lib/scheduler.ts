import { ptoSchedules } from '@modules/pto/scheduler';
import schedule from 'node-schedule';

type ScheduledJob = {
    name: string;
    cron: string;
    run: () => Promise<void> | void;
};

const jobs: ScheduledJob[] = [...ptoSchedules];

export const startScheduler = () => {
    for (const job of jobs) {
        try {
            schedule.scheduleJob(job.name, job.cron, async () => {
                try {
                    await job.run();
                } catch (e) {
                    console.error(`[scheduler:${job.name}] run failed:`, e);
                }
            });
            console.log(`[scheduler] registered ${job.name} (${job.cron})`);
        } catch (e) {
            console.error(`[scheduler:${job.name}] registration failed:`, e);
        }
    }
};
