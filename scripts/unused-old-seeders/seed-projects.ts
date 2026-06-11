import fs from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '@lib/prisma';

import { seedProject } from './seed-project';

const projectSeedDirectory = path.resolve(process.cwd(), 'scripts/data/project-seeds');

export const seedProjects = async () => {
    const entries = await fs.readdir(projectSeedDirectory);
    const projectSeedFiles = entries.filter((entry) => entry.endsWith('.seed.json')).sort();

    console.log(`Seeding ${projectSeedFiles.length} project workbook(s)...`);

    for (const seedFile of projectSeedFiles) {
        process.env.PROJECT_SEED_FILE = path.join('scripts/data/project-seeds', seedFile);
        await seedProject();
    }

    console.log('All project seeds complete!');
};

if (process.argv[1]?.endsWith('seed-projects.ts')) {
    seedProjects()
        .catch((e) => {
            console.error('Project seeds failed:', e);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
