import { failure, success } from '@utils';
import { Hono } from 'hono';

import { seedCostCodes } from '../../../scripts/seed-cost-codes';
import { seedGcTypes } from '../../../scripts/seed-gc-types';
import { seedProfessionalRoles } from '../../../scripts/seed-professional-roles';
import { seedRootFolder } from '../../../scripts/seed-root-folder';
import { seedVendorTypes } from '../../../scripts/seed-vendor-types';

const app = new Hono();

const SEEDERS: Array<{ name: string; run: () => Promise<void> }> = [
    { name: 'root-folder', run: seedRootFolder },
    { name: 'cost-codes', run: seedCostCodes },
    { name: 'professional-roles', run: seedProfessionalRoles },
    { name: 'vendor-types', run: seedVendorTypes },
    { name: 'gc-types', run: seedGcTypes },
];

const runAllSeeders = async (): Promise<void> => {
    console.log('[seeder] starting background run');
    for (const { name, run } of SEEDERS) {
        try {
            await run();
            console.log(`[seeder] ${name} ok`);
        } catch (e) {
            console.error(`[seeder] ${name} failed:`, e);
        }
    }
    console.log('[seeder] background run complete');
};

app.post('/run', (c) => {
    const expected = process.env.SEED_API_KEY;
    if (!expected) {
        return failure(c, 'Seeder endpoint disabled (SEED_API_KEY not set)', 403);
    }

    const provided = c.req.header('x-seed-key');
    if (provided !== expected) {
        return failure(c, 'Invalid seed key', 401);
    }

    void runAllSeeders();

    return success(
        c,
        { seeders: SEEDERS.map((s) => s.name), status: 'started' },
        202,
        'Seeders started in background'
    );
});

export default app;
