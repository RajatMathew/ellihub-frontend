import { prisma } from '@lib/prisma';
import { ulid } from 'ulid';

const categories = [
    { id: ulid(), name: 'Labor', description: 'Labor and workforce costs' },
    { id: ulid(), name: 'Material', description: 'Raw materials and supplies' },
    { id: ulid(), name: 'Subcontractor', description: 'Subcontractor services' },
    { id: ulid(), name: 'Equipment', description: 'Equipment rental and purchases' },
];

export const seedCostCodes = async () => {
    console.log('Seeding cost code categories...');

    const createdCategories = [];
    for (const cat of categories) {
        const existing = await prisma.costCodeCategory.findFirst({
            where: { name: cat.name },
        });

        if (existing) {
            createdCategories.push(existing);
            console.log(`  Category already exists: ${existing.name} (${existing.id})`);
        } else {
            const result = await prisma.costCodeCategory.create({
                data: {
                    id: cat.id,
                    name: cat.name,
                    description: cat.description,
                },
            });
            createdCategories.push(result);
            console.log(`  Created category: ${result.name} (${result.id})`);
        }
    }

    const [labor, material, subcontractor, equipment] = createdCategories;

    const costCodes = [
        { code: '01-100', name: 'General Labor', description: 'General labor costs', categoryId: labor.id },
        { code: '01-200', name: 'Skilled Labor', description: 'Skilled trade labor', categoryId: labor.id },
        { code: '01-300', name: 'Overtime Labor', description: 'Overtime labor costs', categoryId: labor.id },
        { code: '02-100', name: 'Concrete', description: 'Concrete materials', categoryId: material.id },
        { code: '02-200', name: 'Steel', description: 'Structural steel', categoryId: material.id },
        { code: '02-300', name: 'Lumber', description: 'Wood and lumber', categoryId: material.id },
        { code: '03-100', name: 'Electrical Sub', description: 'Electrical subcontractor', categoryId: subcontractor.id },
        { code: '03-200', name: 'Plumbing Sub', description: 'Plumbing subcontractor', categoryId: subcontractor.id },
        { code: '04-100', name: 'Crane Rental', description: 'Crane equipment rental', categoryId: equipment.id },
        { code: '04-200', name: 'Excavator Rental', description: 'Excavator equipment rental', categoryId: equipment.id },
    ];

    console.log('\nSeeding cost codes...');

    for (const cc of costCodes) {
        const existing = await prisma.costCode.findFirst({
            where: { code: cc.code },
        });

        if (existing) {
            console.log(`  Already exists: ${cc.code} - ${cc.name}`);
        } else {
            await prisma.costCode.create({
                data: {
                    id: ulid(),
                    code: cc.code,
                    name: cc.name,
                    description: cc.description,
                    costCodeCategoryId: cc.categoryId,
                },
            });
            console.log(`  Created: ${cc.code} - ${cc.name}`);
        }
    }

    console.log('\nSeed complete!');
};

if (process.argv[1]?.endsWith('seed-cost-codes.ts')) {
    seedCostCodes().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
