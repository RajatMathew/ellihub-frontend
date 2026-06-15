import { prisma } from '@lib/prisma';

import { assertProductionSampleSeedTargetsEmpty, assertProductionSeedTargetsEmpty } from './guards';
import { seedLog } from './reporter';
import { seedProductionData } from './seeders/production';
import { seedSampleProductionData } from './seeders/sample';

const args = new Set(process.argv.slice(2));
const allowedFlags = new Set(['--sample', '--help']);

const printUsage = () => {
    console.log(`Usage:
  bun run db:seed:prod
  bun run db:seed:prod --sample

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

    seedLog.title('Production seed');
    seedLog.section('Preflight');
    await assertProductionSeedTargetsEmpty();
    if (seedSample) await assertProductionSampleSeedTargetsEmpty();
    seedLog.done('preflight', 'Database is empty for production seed targets');
    const { adminUserId } = await seedProductionData();
    if (seedSample) await seedSampleProductionData(adminUserId);
    seedLog.section('Complete');
    seedLog.info('Production seed finished');
    if (!seedSample) {
        seedLog.notice([
            'Sample data was not included in this run.',
            'To include sample data, reset the database first:',
            'bun run db:reset',
            'Then run: bun run db:seed:prod --sample',
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
