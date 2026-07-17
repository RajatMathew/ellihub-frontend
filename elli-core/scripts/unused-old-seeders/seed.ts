type SeedStep = {
    name: string;
    run: () => Promise<void>;
};

const usage = `Usage:
  bun run db:seed
  bun run db:seed --all
  bun run db:seed --reset
  bun run db:seed --reset --all
  bun run db:seed --user --common
  bun run db:seed --employees

Flags:
  --all        Run user and common seeders. This is the default when no flags are passed.
  --reset      Reset the database first. Destructive. If used alone, only reset runs.
  --user       Seed the default admin user and organization.
  --employees  Seed auth-backed employees.
  --common     Seed root folders, lookups, cost codes, employees, vendors, GCs, and projects.
  --help       Show this message.
`;

const args = new Set(process.argv.slice(2));
const allowedFlags = new Set(['--all', '--reset', '--user', '--employees', '--common', '--help']);
const unknownFlags = [...args].filter((arg) => !allowedFlags.has(arg));

const commonSeeders: SeedStep[] = [
    {
        name: 'root-folder',
        run: async () => (await import('./seed-root-folder.js')).seedRootFolder(),
    },
    {
        name: 'cost-codes',
        run: async () => (await import('./seed-cost-codes.js')).seedCostCodes(),
    },
    {
        name: 'vendor-types',
        run: async () => (await import('./seed-vendor-types.js')).seedVendorTypes(),
    },
    { name: 'gc-types', run: async () => (await import('./seed-gc-types.js')).seedGcTypes() },
    {
        name: 'professional-roles',
        run: async () => (await import('./seed-professional-roles.js')).seedProfessionalRoles(),
    },
    { name: 'employees', run: async () => (await import('./seed-employees.js')).seedEmployees() },
    {
        name: 'project-divisions',
        run: async () => (await import('./seed-project-divisions.js')).seedProjectDivisions(),
    },
    {
        name: 'project-stages',
        run: async () => (await import('./seed-project-stages.js')).seedProjectStages(),
    },
    {
        name: 'trade-categories',
        run: async () => (await import('./seed-trade-categories.js')).seedTradeCategories(),
    },
    { name: 'units', run: async () => (await import('./seed-units.js')).seedUnits() },
    { name: 'pto-types', run: async () => (await import('./seed-pto-types.js')).seedPtoTypes() },
    {
        name: 'sco-change-types',
        run: async () => (await import('./seed-sco-change-types.js')).seedScoChangeTypes(),
    },
    { name: 'vendors', run: async () => (await import('./seed-vendors.js')).seedVendors() },
    { name: 'gcs', run: async () => (await import('./seed-gcs.js')).seedGcs() },
    { name: 'projects', run: async () => (await import('./seed-projects.js')).seedProjects() },
];

const resetDatabase = async () => {
    console.log('[seed] resetting database...');
    const proc = Bun.spawn(
        ['bun', 'node_modules/prisma/build/index.js', 'migrate', 'reset', '--force'],
        {
            stdout: 'pipe',
            stderr: 'pipe',
        }
    );
    const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
    ]);

    if (code !== 0) {
        throw new Error(`Database reset failed with exit ${code}\n${stderr || stdout}`);
    }

    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
    console.log('[seed] reset complete');
};

const runStep = async ({ name, run }: SeedStep) => {
    console.log(`[seed] starting ${name}`);
    await run();
    console.log(`[seed] completed ${name}`);
};

const runCommonSeeders = async () => {
    for (const seeder of commonSeeders) {
        await runStep(seeder);
    }
};

const main = async () => {
    if (args.has('--help')) {
        console.log(usage);
        return;
    }

    if (unknownFlags.length > 0) {
        throw new Error(`Unknown seed flag(s): ${unknownFlags.join(', ')}\n\n${usage}`);
    }

    const runDefaultAll = args.size === 0;
    const runAll = runDefaultAll || args.has('--all');
    const runReset = args.has('--reset');
    const runUser = runAll || args.has('--user');
    const runCommon = runAll || args.has('--common');
    const runEmployees = args.has('--employees') && !runCommon;

    if (runReset) {
        await resetDatabase();
    }

    if (runUser) {
        await runStep({
            name: 'user',
            run: async () => (await import('./seed-user.js')).seedUser(),
        });
    }

    if (runEmployees) {
        await runStep({
            name: 'employees',
            run: async () => (await import('./seed-employees.js')).seedEmployees(),
        });
    }

    if (runCommon) {
        await runCommonSeeders();
    }

    console.log('[seed] done');
};

main()
    .catch((e) => {
        console.error('[seed] failed:', e);
        process.exitCode = 1;
    })
    .finally(async () => {
        const { prisma } = await import('../src/lib/prisma.js');
        await prisma.$disconnect();
    });
