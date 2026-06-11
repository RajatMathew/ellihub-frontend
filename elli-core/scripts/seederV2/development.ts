import { prisma } from '@lib/prisma';

import { assertDevelopmentEnvironment, assertDevelopmentSeedTargetsEmpty } from './guards';
import { seedLog } from './reporter';
import {
    ensureDirectoryEntityFolders,
    seedEmployees,
    seedGcs,
    seedProjectWorkbooks,
    seedVendors,
    verifyRootFolders,
} from './seeders/development';
import { seedProductionData } from './seeders/production';
import { seedSampleProductionData } from './seeders/sample';

const args = new Set(process.argv.slice(2));
const allowedFlags = new Set(['--sample', '--help']);

const printUsage = () => {
    console.log(`Usage:
  bun run db:seed:dev
  bun run db:seed:dev --sample

Flags:
  --sample   Add one sample department, PM employee, accountant, vendor, GC, contact, and project.
  --help     Show this message.`);
};

const main = async () => {
    if (args.has('--help')) {
        printUsage();
        return;
    }

    const unknownFlags = [...args].filter((arg) => !allowedFlags.has(arg));
    if (unknownFlags.length > 0) {
        throw new Error(`Unknown seed flag(s): ${unknownFlags.join(', ')}`);
    }

    const seedSample = args.has('--sample');

    seedLog.title('Development seed');
    seedLog.section('Preflight');
    assertDevelopmentEnvironment();
    await assertDevelopmentSeedTargetsEmpty();
    seedLog.done('preflight', 'Database is empty for development seed targets');

    seedLog.section('Production baseline');
    const { adminUserId } = await seedProductionData();
    await verifyRootFolders();

    seedLog.section('Development data');
    await seedEmployees(adminUserId);
    await seedVendors(adminUserId);
    await seedGcs(adminUserId);
    await seedProjectWorkbooks(adminUserId);
    await ensureDirectoryEntityFolders(adminUserId);
    if (seedSample) await seedSampleProductionData(adminUserId);

    seedLog.section('Complete');
    seedLog.info('Development seed finished');
    if (!seedSample) {
        seedLog.notice([
            'Sample data was not included in this run.',
            'To include sample data, reset the database first:',
            'bun run db:reset',
            'Then run: bun run db:seed:dev --sample',
        ]);
    }
};

main()
    .catch((error) => {
        console.error('');
        console.error('Seed failed');
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
