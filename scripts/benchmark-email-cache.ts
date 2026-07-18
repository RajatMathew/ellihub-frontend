import { prisma } from '../src/lib/prisma';

const PAGE_SIZE = 30;
const MAX_ACCOUNTS = 100;

const percentile = (values: number[], value: number) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)] || 0;
};

const run = async () => {
    const accountId = process.env.BENCHMARK_EMAIL_ACCOUNT_ID?.trim();
    const accounts = await prisma.emailAccount.findMany({
        where: accountId ? { id: accountId } : { status: 'CONNECTED' },
        select: { id: true },
        take: MAX_ACCOUNTS,
    });
    if (accounts.length === 0) {
        throw new Error(
            'No connected email accounts found. Set BENCHMARK_EMAIL_ACCOUNT_ID to a seeded account.'
        );
    }

    const durations: number[] = [];
    for (const account of accounts) {
        const startedAt = performance.now();
        await prisma.$queryRaw`
            WITH ranked AS (
                SELECT
                    message."id",
                    ROW_NUMBER() OVER (
                        PARTITION BY message."conversationKey"
                        ORDER BY COALESCE(message."receivedAt", message."sentAt", message."createdAt") DESC
                    ) AS row_number,
                    COALESCE(message."receivedAt", message."sentAt", message."createdAt") AS sort_time
                FROM "EmailMessageCache" AS message
                INNER JOIN "EmailFolderCache" AS folder ON folder."id" = message."folderId"
                WHERE message."accountId" = ${account.id}
                  AND message."deletedAt" IS NULL
                  AND folder."wellKnownKey" = 'INBOX'
            )
            SELECT "id"
            FROM ranked
            WHERE row_number = 1
            ORDER BY sort_time DESC
            LIMIT ${PAGE_SIZE}
        `;
        durations.push(performance.now() - startedAt);
    }

    const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    console.info({
        accounts: accounts.length,
        pageSize: PAGE_SIZE,
        averageMs: Number(average.toFixed(2)),
        p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
        maxMs: Number(Math.max(...durations).toFixed(2)),
        targetP95Ms: 150,
    });
};

try {
    await run();
} finally {
    await prisma.$disconnect();
}
