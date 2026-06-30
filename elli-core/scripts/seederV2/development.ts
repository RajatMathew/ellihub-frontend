import { prisma } from '@lib/prisma';

import { assertDevelopmentEnvironment, assertDevelopmentSeedTargetsEmpty } from './guards';
import { seedLog } from './reporter';
import {
    ensureDirectoryEntityFolders,
    seedEmployees,
    seedExtraMockProjects,
    seedGcs,
    seedProjectWorkbooks,
    seedVendors,
    verifyRootFolders,
} from './seeders/dev-data';
import { seedProductionData } from './seeders/production';
import { seedSampleProductionData } from './seeders/sample';

import type { ExtraMockGenerationOptions } from './generate-extra-mock-projects';

const extraMockProjectSeedConfig = {
    projects: 1000,
    posPerProject: 6,
    rfqsPerProject: 3,
    subChangeOrdersPerProject: 2,
    vendorPoolSize: 250,
    gcPoolSize: 100,
    minIssueDate: '2026-01-22',
    maxIssueDate: '2026-06-10',
    importConcurrency: 8,
} satisfies ExtraMockGenerationOptions;

const args = new Set(process.argv.slice(2));
const allowedFlags = new Set(['--sample', '--extra', '--help']);

const printUsage = () => {
    console.log(`Usage:
  bun run db:seed:dev
  bun run db:seed:dev --sample
  bun run db:seed:dev --extra
  bun run db:seed:dev --sample --extra

Flags:
  --sample   Add one sample department, PM employee, accountant, vendor, GC, contact, and project.
  --extra    Add generated mock projects with RFQs, POs, invoices, and SCOs.
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
    const seedExtra = args.has('--extra');

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
    if (seedExtra) {
        seedLog.section('Extra project data');
        await seedExtraMockProjects(adminUserId, extraMockProjectSeedConfig);
    }
    if (seedSample) await seedSampleProductionData(adminUserId);
    await ensureDirectoryEntityFolders(adminUserId);

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
    if (!seedExtra) {
        seedLog.notice([
            'Extra mock projects were not included in this run.',
            'To include extra mock data, reset the database first:',
            'bun run db:reset',
            'Then run: bun run db:seed:dev --extra',
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
