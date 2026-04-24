import { failure, success } from '@utils';
import { Hono } from 'hono';

import { seedCostCodes } from '../../../scripts/seed-cost-codes';
import { seedGcTypes } from '../../../scripts/seed-gc-types';
import { seedProfessionalRoles } from '../../../scripts/seed-professional-roles';
import { seedProjectStages } from '../../../scripts/seed-project-stages';
import { seedPtoTypes } from '../../../scripts/seed-pto-types';
import { seedRootFolder } from '../../../scripts/seed-root-folder';
import { seedTradeCategories } from '../../../scripts/seed-trade-categories';
import { seedUnits } from '../../../scripts/seed-units';
import { seedUser } from '../../../scripts/seed-user';
import { seedVendorTypes } from '../../../scripts/seed-vendor-types';

const app = new Hono();

const SEEDERS: Array<{ name: string; run: () => Promise<void> }> = [
    { name: 'root-folder', run: seedRootFolder },
    { name: 'cost-codes', run: seedCostCodes },
    { name: 'professional-roles', run: seedProfessionalRoles },
    { name: 'vendor-types', run: seedVendorTypes },
    { name: 'gc-types', run: seedGcTypes },
    { name: 'project-stages', run: seedProjectStages },
    { name: 'trade-categories', run: seedTradeCategories },
    { name: 'units', run: seedUnits },
    { name: 'pto-types', run: seedPtoTypes },
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

app.post('/reset', (c) => {
    const expected = process.env.SEED_API_KEY;
    if (!expected) {
        return failure(c, 'Seeder endpoint disabled (SEED_API_KEY not set)', 403);
    }

    const provided = c.req.header('x-seed-key');
    if (provided !== expected) {
        return failure(c, 'Invalid seed key', 401);
    }

    void (async () => {
        console.log('[seeder] starting db reset (prisma migrate reset)');
        try {
            const proc = Bun.spawn(['bunx', 'prisma', 'migrate', 'reset', '--force'], {
                stdout: 'pipe',
                stderr: 'pipe',
            });
            const [stdout, stderr, code] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text(),
                proc.exited,
            ]);
            if (code === 0) {
                console.log('[seeder] db reset ok\n', stdout);
            } else {
                console.error(`[seeder] db reset failed (exit ${code})\n`, stderr || stdout);
            }
        } catch (e) {
            console.error('[seeder] db reset failed:', e);
        }
    })();

    return success(c, { status: 'started' }, 202, 'DB reset started in background');
});

app.post('/user', (c) => {
    const expected = process.env.SEED_API_KEY;
    if (!expected) {
        return failure(c, 'Seeder endpoint disabled (SEED_API_KEY not set)', 403);
    }

    const provided = c.req.header('x-seed-key');
    if (provided !== expected) {
        return failure(c, 'Invalid seed key', 401);
    }

    void (async () => {
        console.log('[seeder] starting user seed');
        try {
            await seedUser();
            console.log('[seeder] user seed ok');
        } catch (e) {
            console.error('[seeder] user seed failed:', e);
        }
    })();

    return success(c, { status: 'started' }, 202, 'User seeder started in background');
});

export default app;
