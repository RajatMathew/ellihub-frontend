import { resolve } from 'path';

import { failure, success } from '@utils';
import { Hono } from 'hono';

const app = new Hono();

const SEED_SCRIPTS = [
    'seed-root-folder.ts',
    'seed-cost-codes.ts',
    'seed-professional-roles.ts',
    'seed-vendor-types.ts',
    'seed-gc-types.ts',
];

const runScript = async (
    script: string
): Promise<{ script: string; ok: boolean; output: string }> => {
    const path = resolve(process.cwd(), 'scripts', script);
    const proc = Bun.spawn(['bun', 'run', path], {
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;

    return {
        script,
        ok: exitCode === 0,
        output: [stdout, stderr].filter(Boolean).join('\n'),
    };
};

app.post('/run', async (c) => {
    const expected = process.env.SEED_API_KEY;
    if (!expected) {
        return failure(c, 'Seeder endpoint disabled (SEED_API_KEY not set)', 403);
    }

    const provided = c.req.header('x-seed-key');
    if (provided !== expected) {
        return failure(c, 'Invalid seed key', 401);
    }

    const results = [];
    for (const script of SEED_SCRIPTS) {
        results.push(await runScript(script));
    }

    const allOk = results.every((r) => r.ok);
    return success(c, { allOk, results }, allOk ? 200 : 500);
});

export default app;
