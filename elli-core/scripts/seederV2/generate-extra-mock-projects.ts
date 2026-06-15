import { faker } from '@faker-js/faker';

import { seedLog } from './reporter';

import type { ProjectSeed } from './seeders/projects';

export type ExtraMockGenerationOptions = {
    projects: number;
    posPerProject: number;
    rfqsPerProject: number;
    subChangeOrdersPerProject: number;
    vendorPoolSize: number;
    gcPoolSize: number;
    minIssueDate: string;
    maxIssueDate: string;
    importConcurrency: number;
};

export type ExtraMockGenerationSummary = {
    projectCount: number;
    rfqCount: number;
    purchaseOrderCount: number;
    purchaseOrderLineItemCount: number;
    paidInvoiceCount: number;
    subChangeOrderCount: number;
    minIssueDate: string | null;
    maxIssueDate: string | null;
};

export type ResolvedExtraMockGenerationOptions = ExtraMockGenerationOptions & {
    projectCount: number;
    purchaseOrderCount: number;
};

const leadPmNames = [
    'Shalini S.',
    'Steven B.',
    'Mahavir S.',
    'Sebastian W.',
    'Juan M.',
    'Lucas C.',
    'Piotr B.',
    'Tomasz B.',
] as const;
const projectStages = [
    'ONBOARDING',
    'SUBMITTALS',
    'BUYOUT',
    'FABRICATION',
    'INSTALLATION',
    'PUNCHLIST',
    'CLOSEOUT',
] as const;
const projectDivisions = ['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL'] as const;
const trades = ['MATERIAL', 'FABRICATION', 'INSTALLATION', 'LABOR', 'EQUIPMENT'] as const;
const units = ['EACH', 'SET', 'LUMP_SUM', 'SQ_FT', 'FOOT'] as const;
const neighborhoods = [
    'Brooklyn',
    'Queens',
    'Bronx',
    'Manhattan',
    'Staten Island',
    'Long Island City',
    'Flushing',
    'Jamaica',
    'Astoria',
    'Williamsburg',
    'Harlem',
    'Mott Haven',
] as const;
const facilityTypes = [
    'Public School',
    'Library',
    'Recreation Center',
    'Municipal Office',
    'College Hall',
    'Firehouse',
    'Courthouse Annex',
    'Community Center',
] as const;
const projectScopes = [
    'Facade Restoration',
    'Roof Replacement',
    'Window Upgrade',
    'Lobby Renovation',
    'Mechanical Upgrade',
    'Elevator Modernization',
    'Sitework Improvements',
    'Cafeteria Renovation',
    'ADA Compliance Upgrade',
    'Auditorium Renovation',
] as const;
const constructionPackages = [
    'Structural steel',
    'Architectural metal',
    'Exterior masonry',
    'Roofing and flashing',
    'Interior finishes',
    'Doors and hardware',
    'Glazing and storefront',
    'Mechanical equipment',
    'Electrical rough-in',
    'Site concrete',
    'Millwork',
    'Firestopping',
] as const;
const constructionItems = [
    'Galvanized lintel replacement',
    'Stainless steel anchor assembly',
    'CMU partition patching',
    'Cast stone sill replacement',
    'EPDM roof membrane',
    'Aluminum storefront frame',
    'Fire-rated hollow metal door',
    'Access panel installation',
    'Conduit and junction box rough-in',
    'Concrete curb repair',
    'Acoustic ceiling tile replacement',
    'Custom millwork panel',
    'Temporary protection',
    'Field survey and layout',
    'Punch list closeout labor',
] as const;
const scoReasons = [
    'Field condition',
    'Owner requested revision',
    'Drawing coordination',
    'Quantity adjustment',
    'Material substitution',
] as const;

const money = (value: number) => String(Math.round(value * 100) / 100);

const parseDateOnly = (value: string) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid extra mock issue date: ${value}`);
    }
    return parsed;
};

const formatDateOnly = (value: Date) => value.toISOString().slice(0, 10);

const addDays = (value: string, days: number) => {
    const dateValue = parseDateOnly(value);
    dateValue.setUTCDate(dateValue.getUTCDate() + days);
    return formatDateOnly(dateValue);
};

const sample = <T>(values: readonly T[], index: number): T => values[index % values.length];

const mockVendorName = (index: number, poolSize: number) =>
    `Mock Vendor ${String((index % poolSize) + 1).padStart(3, '0')} LLC`;

const mockGcName = (index: number, poolSize: number) =>
    `Mock GC ${String((index % poolSize) + 1).padStart(3, '0')} Construction`;

const mockGcContactName = (index: number, poolSize: number) =>
    `Mock GC Contact ${String((index % poolSize) + 1).padStart(3, '0')}`;

const assertPositiveInteger = (name: string, value: number) => {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Extra mock ${name} must be a positive integer.`);
    }
};

const distributeCount = (total: number, bucketCount: number, bucketIndex: number) => {
    const base = Math.floor(total / bucketCount);
    const remainder = total % bucketCount;
    return base + (bucketIndex <= remainder ? 1 : 0);
};

const distributedStartIndex = (total: number, bucketCount: number, bucketIndex: number) => {
    const base = Math.floor(total / bucketCount);
    const remainder = total % bucketCount;
    const completedBuckets = bucketIndex - 1;
    return base * completedBuckets + Math.min(completedBuckets, remainder);
};

const issueDateForPurchaseOrder = (
    globalPoIndex: number,
    totalPurchaseOrderCount: number,
    minIssueDate: string,
    maxIssueDate: string
) => {
    const start = parseDateOnly(minIssueDate);
    const end = parseDateOnly(maxIssueDate);
    const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);

    if (spanDays < 0) {
        throw new Error('Extra mock maxIssueDate must be on or after minIssueDate.');
    }

    const offset =
        totalPurchaseOrderCount <= 1
            ? 0
            : Math.round((globalPoIndex / (totalPurchaseOrderCount - 1)) * spanDays);
    return addDays(minIssueDate, offset);
};

const buildSeed = (
    index: number,
    options: ResolvedExtraMockGenerationOptions,
    purchaseOrdersForProject: number,
    globalPurchaseOrderStartIndex: number
): ProjectSeed => {
    faker.seed(10_000 + index);

    const projectNumber = `MOCK-${String(index).padStart(4, '0')}`;
    const neighborhood = sample(neighborhoods, index - 1);
    const facilityType = sample(facilityTypes, index + 2);
    const scope = sample(projectScopes, index + 4);
    const projectName = `${neighborhood} ${facilityType} ${scope} ${index}`;
    const sourceWorkbook = `${projectName} mock workbook`;
    const gcPoolIndex = index - 1;
    const gcName = mockGcName(gcPoolIndex, options.gcPoolSize);
    const gcContactName = mockGcContactName(gcPoolIndex, options.gcPoolSize);
    const leadPm = sample(leadPmNames, index - 1);
    const stage = sample(projectStages, index - 1);
    const division = sample(projectDivisions, index - 1);
    const contractValue = faker.number.int({ min: 150_000, max: 9_500_000 });
    const retainagePercent = faker.helpers.arrayElement([5, 10]);
    const targetBudgetPercent = faker.number.int({ min: 12, max: 35 });

    const rfqs = Array.from({ length: options.rfqsPerProject }, (_, rfqIndex) => {
        const rfqNumber = rfqIndex + 1;
        const issueDate = issueDateForPurchaseOrder(
            globalPurchaseOrderStartIndex,
            options.purchaseOrderCount,
            options.minIssueDate,
            options.maxIssueDate
        );
        const vendorNames = Array.from({ length: rfqIndex % 2 === 0 ? 2 : 1 }, (_, index) =>
            mockVendorName(globalPurchaseOrderStartIndex + rfqIndex + index, options.vendorPoolSize)
        );

        return {
            'PROJECT NUMBER': projectNumber,
            'PROJECT NAME': projectName,
            RFQ_ID: `RFQ-${projectNumber}-${String(rfqNumber).padStart(2, '0')}`,
            Title: `${sample(constructionPackages, index + rfqIndex)} package`,
            Vendor: vendorNames.join(' | '),
            Status: 'DRAFT',
            Final_Amount: money(faker.number.int({ min: 7_500, max: 185_000 })),
            'Issued Date': addDays(issueDate, -20 + rfqNumber),
        };
    });

    const rfqLineItems = rfqs.flatMap((rfq, rfqIndex) =>
        Array.from({ length: 3 }, (_, lineIndex) => {
            const quantity = faker.number.int({ min: 1, max: 80 });
            const unitPrice = faker.number.int({ min: 75, max: 2_500 });
            return {
                'PROJECT NUMBER': projectNumber,
                'PROJECT NAME': projectName,
                RFQ_ID: rfq.RFQ_ID,
                Item: `${sample(constructionItems, index + rfqIndex + lineIndex)} ${rfqIndex + 1}.${lineIndex + 1}`,
                Unit: sample(units, lineIndex),
                Qty: String(quantity),
                Unit_Price: money(unitPrice),
            };
        })
    );

    const rfqAttachments = rfqs.map((rfq) => ({
        'PROJECT NUMBER': projectNumber,
        'PROJECT NAME': projectName,
        RFQ_ID: rfq.RFQ_ID,
        Document_Name: null,
        Document_Link: null,
    }));

    const purchaseOrders = Array.from({ length: purchaseOrdersForProject }, (_, poIndex) => {
        const poNumber = poIndex + 1;
        const subtotal = faker.number.int({ min: 2_500, max: 225_000 });
        const linkedRfq = rfqs[poIndex % rfqs.length]?.RFQ_ID ?? null;
        const issueDate = issueDateForPurchaseOrder(
            globalPurchaseOrderStartIndex + poIndex,
            options.purchaseOrderCount,
            options.minIssueDate,
            options.maxIssueDate
        );

        return {
            'PROJECT NUMBER': projectNumber,
            'PROJECT NAME': projectName,
            PO_ID: `PO-M${String(globalPurchaseOrderStartIndex + poNumber).padStart(3, '0')}`,
            Linked_RFQ_ID: poIndex % 3 === 0 ? null : linkedRfq,
            Issue_Date: issueDate,
            Status: faker.helpers.arrayElement(['DRAFT', 'ISSUED', 'DELIVERED']),
            Vendor: mockVendorName(globalPurchaseOrderStartIndex + poIndex, options.vendorPoolSize),
            Trade: sample(trades, poIndex),
            PO_Amount: money(subtotal),
            Tax_Rate: null,
            Expected_Date: addDays(issueDate, 25),
            Delivery_Date: poIndex % 4 === 0 ? addDays(issueDate, 50) : null,
            Payment_Terms: 'NET_30',
            Lead_Time: `${faker.number.int({ min: 1, max: 8 })} weeks`,
            Ship_To: projectName,
            Notes: `${sample(constructionPackages, poIndex)} release for ${scope.toLowerCase()}.`,
            Created_By: leadPm,
            Document_Link: null,
        };
    });

    const poLineItems = purchaseOrders.flatMap((po, poIndex) =>
        Array.from({ length: 4 }, (_, lineIndex) => {
            const quantity = faker.number.int({ min: 1, max: 45 });
            const unitPrice = faker.number.int({ min: 50, max: 4_000 });
            return {
                'PROJECT NUMBER': projectNumber,
                'PROJECT NAME': projectName,
                PO_ID: po.PO_ID,
                Item: `${sample(constructionItems, index + poIndex + lineIndex)} ${poIndex + 1}.${lineIndex + 1}`,
                Qty: String(quantity),
                Unit: sample(units, lineIndex),
                Unit_Price: money(unitPrice),
                Price: money(quantity * unitPrice),
            };
        })
    );

    const poPayments = purchaseOrders.flatMap((po, poIndex) => {
        const amount = Number(po.PO_Amount);
        return [
            {
                'PROJECT NUMBER': projectNumber,
                'PROJECT NAME': projectName,
                PO_ID: po.PO_ID,
                Date: addDays(po.Issue_Date, 70),
                'CHK#': `${projectNumber}-PAY-${String(poIndex + 1).padStart(3, '0')}-A`,
                Note: 'Mock deposit payment',
                Amount: money(amount * 0.35),
            },
            {
                'PROJECT NUMBER': projectNumber,
                'PROJECT NAME': projectName,
                PO_ID: po.PO_ID,
                Date: addDays(po.Issue_Date, 100),
                'CHK#': `${projectNumber}-PAY-${String(poIndex + 1).padStart(3, '0')}-B`,
                Note: 'Mock progress payment',
                Amount: money(amount * 0.4),
            },
        ];
    });

    const poChangeOrders = Array.from(
        { length: options.subChangeOrdersPerProject },
        (_, scoIndex) => {
            const po = purchaseOrders[scoIndex % purchaseOrders.length];
            return {
                'PROJECT NUMBER': projectNumber,
                'PROJECT NAME': projectName,
                PO_ID: po.PO_ID,
                PO_CO_ID: `${po.PO_ID}-SCO-${String(scoIndex + 1).padStart(3, '0')}`,
                Name: `${sample(constructionPackages, index + scoIndex)} field change ${scoIndex + 1}`,
                Description: `${sample(constructionItems, index + scoIndex)} required after field coordination.`,
                Reason: sample(scoReasons, index + scoIndex),
                Status: faker.helpers.arrayElement(['DRAFT', 'APPROVED']),
                Amount: money(faker.number.int({ min: 750, max: 35_000 })),
                Schedule_Impact_Days: String(faker.number.int({ min: 0, max: 14 })),
                Markup_Pct: String(faker.helpers.arrayElement([0, 5, 10, 15])),
                Creator: leadPm,
                Assignee: po.Vendor,
                Due_Date: addDays(po.Issue_Date, 130 + scoIndex),
                Approval_Date: addDays(po.Issue_Date, 140 + scoIndex),
                Document_Link: null,
            };
        }
    );

    const poCoLineItems = poChangeOrders.flatMap((sco, scoIndex) =>
        Array.from({ length: 2 }, (_, lineIndex) => {
            const quantity = faker.number.int({ min: 1, max: 12 });
            const unitPrice = faker.number.int({ min: 125, max: 2_250 });
            return {
                'PROJECT NUMBER': projectNumber,
                'PROJECT NAME': projectName,
                PO_ID: sco.PO_ID,
                PO_CO_ID: sco.PO_CO_ID,
                Item: `${sample(constructionItems, index + scoIndex + lineIndex)} change ${scoIndex + 1}.${lineIndex + 1}`,
                Qty: String(quantity),
                Unit: sample(units, lineIndex),
                Unit_Price: money(unitPrice),
                Price: money(quantity * unitPrice),
            };
        })
    );

    return {
        sourceWorkbook,
        project: {
            Project_Name: projectName,
            Project_Description: `${scope} at a ${facilityType.toLowerCase()} in ${neighborhood}.`,
            Project_Number: projectNumber,
            Project_Status: 'ACTIVE',
            Lead_PM: leadPm,
            Division: division,
            Contract_Category: division,
            Contract_Type: 'Lump Sum',
            GC_Name: gcName,
            GC_Contact: gcContactName,
            Address: `${faker.location.streetAddress()}, ${neighborhood}, NY ${faker.number.int({ min: 10001, max: 11697 })}`,
            TCO_Date: '01/01/2027',
            Stage: stage,
            Normalized_Stage: stage,
            Payment_Terms: 'NET_30',
            Retainage_Percent: String(retainagePercent),
            Target_Budget_Percent: String(targetBudgetPercent),
            Tax_Rate: '0',
        },
        primeContract: {
            Contract_ID: `${projectNumber}-CONTRACT`,
            Contract_Type: 'Prime Contract',
            Division: division,
            Contract_Category: division,
            GC_Name: gcName,
            GC_Contact_Name: gcContactName,
            GC_Contact_Email: faker.internet.email({
                firstName: gcContactName.split(' ')[0],
                lastName: gcContactName.split(' ').slice(1).join(' '),
            }),
            GC_Contact_Phone: faker.phone.number({ style: 'national' }),
            Original_Contract_Value: money(contractValue),
            Retainage_Percent: String(retainagePercent),
            Target_Budget_Percent: String(targetBudgetPercent),
            Tax_Rate: '0',
            TCO_Date: '01/01/2027',
            Payment_Terms: 'Net 30',
            Normalized_Payment_Terms: 'NET_30',
            Contract_Document_Link: null,
            Contract_Scheduled_Document_Link: null,
            Contract_Document_File: null,
            Contract_Scheduled_Document_File: null,
        },
        primeContracts: [],
        rfqs,
        rfqLineItems,
        rfqAttachments,
        purchaseOrders,
        poLineItems,
        poPayments,
        poChangeOrders,
        poCoLineItems,
    };
};

export const resolveExtraMockGenerationOptions = (
    options: ExtraMockGenerationOptions
): ResolvedExtraMockGenerationOptions => {
    const projectCount = options.projects;
    const configuredPurchaseOrderCount = projectCount * options.posPerProject;

    assertPositiveInteger('projects', options.projects);
    assertPositiveInteger('posPerProject', options.posPerProject);
    assertPositiveInteger('rfqsPerProject', options.rfqsPerProject);
    assertPositiveInteger('subChangeOrdersPerProject', options.subChangeOrdersPerProject);
    assertPositiveInteger('vendorPoolSize', options.vendorPoolSize);
    assertPositiveInteger('gcPoolSize', options.gcPoolSize);
    assertPositiveInteger('importConcurrency', options.importConcurrency);

    const start = parseDateOnly(options.minIssueDate);
    const end = parseDateOnly(options.maxIssueDate);
    if (end.getTime() < start.getTime()) {
        throw new Error('Extra mock maxIssueDate must be on or after minIssueDate.');
    }

    const resolvedOptions: ResolvedExtraMockGenerationOptions = {
        ...options,
        projectCount,
        purchaseOrderCount: configuredPurchaseOrderCount,
    };
    return resolvedOptions;
};

export const generateExtraMockProjectSeed = (
    index: number,
    options: ResolvedExtraMockGenerationOptions
): ProjectSeed => {
    const purchaseOrdersForProject = distributeCount(
        options.purchaseOrderCount,
        options.projectCount,
        index
    );
    const globalPurchaseOrderStartIndex = distributedStartIndex(
        options.purchaseOrderCount,
        options.projectCount,
        index
    );
    return buildSeed(index, options, purchaseOrdersForProject, globalPurchaseOrderStartIndex);
};

export const summarizeExtraMockProjectSeeds = (
    options: ResolvedExtraMockGenerationOptions
): ExtraMockGenerationSummary => {
    return {
        projectCount: options.projectCount,
        rfqCount: options.projectCount * options.rfqsPerProject,
        purchaseOrderCount: options.purchaseOrderCount,
        purchaseOrderLineItemCount: options.purchaseOrderCount * 4,
        paidInvoiceCount: options.purchaseOrderCount * 2,
        subChangeOrderCount: options.projectCount * options.subChangeOrdersPerProject,
        minIssueDate: options.purchaseOrderCount > 0 ? options.minIssueDate : null,
        maxIssueDate: options.purchaseOrderCount > 0 ? options.maxIssueDate : null,
    };
};

if (process.argv[1]?.endsWith('generate-extra-mock-projects.ts')) {
    try {
        const resolvedOptions = resolveExtraMockGenerationOptions({
            projects: 1000,
            posPerProject: 6,
            rfqsPerProject: 3,
            subChangeOrdersPerProject: 2,
            vendorPoolSize: 250,
            gcPoolSize: 100,
            minIssueDate: '2026-01-22',
            maxIssueDate: '2026-06-10',
            importConcurrency: 8,
        });
        const summary = summarizeExtraMockProjectSeeds(resolvedOptions);
        seedLog.table('Prepared extra mock project seeds', [
            { label: 'Projects', value: summary.projectCount },
            { label: 'RFQs', value: summary.rfqCount },
            { label: 'POs', value: summary.purchaseOrderCount },
            { label: 'PO lines', value: summary.purchaseOrderLineItemCount },
            { label: 'Paid invoices', value: summary.paidInvoiceCount },
            { label: 'SCOs', value: summary.subChangeOrderCount },
            { label: 'Min issue date', value: summary.minIssueDate ?? 'n/a' },
            { label: 'Max issue date', value: summary.maxIssueDate ?? 'n/a' },
        ]);
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}
