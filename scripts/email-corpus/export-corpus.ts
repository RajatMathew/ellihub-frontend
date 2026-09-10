/**
 * Exports real message bodies from a local elli-core database into a JSONL
 * corpus for the quote-detection and rendering harnesses.
 *
 * Why this exists: elli-ui#788 shipped quote detection tuned on a handful of
 * synthetic samples and fell over on real mail. The cached bodies in a dev
 * database are the ground truth we should have been measuring against — 17k of
 * them, dominated by Outlook/Graph markup that the synthetic samples barely
 * covered.
 *
 * The corpus is REAL MAIL. It is written to `output/` (gitignored) and must
 * never be committed, pasted into an issue, or sent anywhere. The harnesses
 * report aggregate counts and structural shapes, not message content.
 *
 *   bun scripts/email-corpus/export-corpus.ts [--limit N] [--out PATH]
 *
 * Requires a reachable Postgres; reads DATABASE_URL, or falls back to the
 * local docker-compose database elli-core brings up.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { SQL } from 'bun';

const DEFAULT_DATABASE_URL = 'postgres://postgres:postgres@localhost:45435/postgres';
const DEFAULT_OUTPUT = 'output/email-corpus/bodies.jsonl';

type CorpusRow = {
  id: string;
  accountId: string;
  serviceType: string;
  subjectLength: number;
  bodyHtml: string | null;
  bodyText: string | null;
};

function parseArgs(argv: string[]) {
  const limitIndex = argv.indexOf('--limit');
  const outIndex = argv.indexOf('--out');
  return {
    limit: limitIndex >= 0 ? Number(argv[limitIndex + 1]) : null,
    out: outIndex >= 0 ? (argv[outIndex + 1] ?? DEFAULT_OUTPUT) : DEFAULT_OUTPUT,
  };
}

/**
 * elli-core's DATABASE_URL carries Prisma's `?schema=public`, which Bun's
 * Postgres driver rejects outright ("invalid startup packet layout"). Drop the
 * query string so the same env var works for both.
 */
function toDriverUrl(value: string): string {
  try {
    const url = new URL(value);
    url.search = '';
    return url.toString();
  } catch {
    return value;
  }
}

async function main() {
  const { limit, out } = parseArgs(process.argv.slice(2));
  const databaseUrl = toDriverUrl(process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL);
  const sql = new SQL(databaseUrl);

  // Subject is exported as a length only: the harnesses never need to read it,
  // and it is the most quotable part of a message.
  const rows = (await sql`
    SELECT
      m."id",
      m."accountId",
      a."serviceType"::text AS "serviceType",
      COALESCE(length(m."subject"), 0) AS "subjectLength",
      m."bodyHtml",
      m."bodyText"
    FROM "EmailMessageCache" m
    JOIN "EmailAccount" a ON a."id" = m."accountId"
    WHERE m."deletedAt" IS NULL
      AND (m."bodyHtml" IS NOT NULL OR m."bodyText" IS NOT NULL)
    ORDER BY m."receivedAt" DESC NULLS LAST
    ${limit ? sql`LIMIT ${limit}` : sql``}
  `) as CorpusRow[];

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, rows.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');

  const byService = new Map<string, number>();
  for (const row of rows) {
    byService.set(row.serviceType, (byService.get(row.serviceType) ?? 0) + 1);
  }

  console.log(`Exported ${rows.length} bodies to ${out}`);
  for (const [service, count] of [...byService].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${service.padEnd(10)} ${count}`);
  }
  await sql.end();
}

await main();
