/**
 * Measures quote detection against the real corpus.
 *
 * Two questions, answered over every cached body rather than a handful of
 * synthetic samples:
 *
 *   1. What is actually in our mail? A census of the markers a detector could
 *      key on, so we build for the markup we receive instead of the markup the
 *      reference implementations happen to document.
 *
 *   2. What does a given detector DO with it? Every body is classified, and the
 *      buckets that indicate a bug — collapsed the whole message, collapsed
 *      nothing despite obvious markers, left a suspiciously short visible part
 *      — are counted and sampled by id.
 *
 * Ids are printed, never content: the corpus is real mail (see export-corpus).
 * Look a sample up with:
 *   grep '"<id>"' output/email-corpus/bodies.jsonl | bun scripts/email-corpus/show-body.ts
 *
 *   bun scripts/email-corpus/analyze-quotes.ts [--corpus PATH] [--samples N]
 */

import { unlink } from 'node:fs/promises';

import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Resource loading OFF. Real bodies reference remote images, stylesheets and
// the occasional iframe; left enabled, happy-dom tries to fetch every one of
// them and the run stalls on network timeouts rather than on parsing.
if (typeof globalThis.document === 'undefined') {
  GlobalRegistrator.register({
    settings: {
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      disableComputedStyleRendering: true,
    },
  });
}

/**
 * Which detector to measure. `v0` is the first attempt, vendored here purely as
 * a baseline to compare against; `current` is what the app actually ships.
 * Running both over the same corpus is how a change is shown to be an
 * improvement rather than merely different.
 */
const detectorName = process.argv.includes('--detector')
  ? process.argv[process.argv.indexOf('--detector') + 1]
  : 'current';

const detector =
  detectorName === 'v0'
    ? await import('./detector-v0')
    : await import('../../src/modules/email/lib/email-quoted-content');

const { markQuotedEmailContent, QUOTED_CONTENT_ATTRIBUTE } = detector;

const DEFAULT_CORPUS = 'output/email-corpus/bodies.jsonl';
const DEFAULT_SAMPLES = 8;

type CorpusRow = {
  id: string;
  accountId: string;
  serviceType: string;
  bodyHtml: string | null;
  bodyText: string | null;
};

/**
 * Every marker a quote detector could key on. Cheap substring/regex tests over
 * the raw source — this is a census of what exists, deliberately independent of
 * the detector under test so the two can disagree.
 */
const MARKERS: Array<[string, (html: string) => boolean]> = [
  ['gmail_quote', (h) => /gmail_quote/i.test(h)],
  ['gmail_attr', (h) => /gmail_attr/i.test(h)],
  ['yahoo_quoted', (h) => /yahoo_quoted/i.test(h)],
  ['moz-cite-prefix', (h) => /moz-cite-prefix/i.test(h)],
  ['protonmail_quote', (h) => /protonmail_quote/i.test(h)],
  ['zmail_extra', (h) => /zmail_extra/i.test(h)],
  ['OLK_SRC_BODY_SECTION', (h) => /OLK_SRC_BODY_SECTION/i.test(h)],
  ['divRplyFwdMsg', (h) => /divRplyFwdMsg/i.test(h)],
  ['appendonsend', (h) => /id=["']?appendonsend/i.test(h)],
  ['outlook border-top divider', (h) => /border-top:\s*solid\s*#[0-9a-f]{3,6}\s*1\.0pt/i.test(h)],
  ['blockquote', (h) => /<blockquote/i.test(h)],
  ['blockquote[type=cite]', (h) => /<blockquote[^>]*type=["']?cite/i.test(h)],
  ['-----Original Message-----', (h) => /-{2,}\s*original message\s*-{2,}/i.test(h)],
  ['Begin forwarded message', (h) => /begin forwarded message/i.test(h)],
  ['underscore rule', (h) => /_{10,}/.test(h)],
  ['"wrote:" attribution', (h) => /\bwrote:\s*(<|$)/im.test(h)],
  ['From:/Sent:/Subject: block', (h) => /<b>\s*(from|sent|to|subject)\s*:/i.test(h)],
  ['<style>', (h) => /<style[\s>]/i.test(h)],
  ['<table', (h) => /<table[\s>]/i.test(h)],
  ['<script', (h) => /<script[\s>]/i.test(h)],
  ['on* handler attr', (h) => /\son[a-z]+\s*=/i.test(h)],
  ['<svg', (h) => /<svg[\s>]/i.test(h)],
  ['<math', (h) => /<math[\s>]/i.test(h)],
  ['cid: image', (h) => /src=["']?cid:/i.test(h)],
];

type Outcome = 'no-quote-found' | 'collapsed' | 'collapsed-hiding-signature' | 'error';

type Result = {
  id: string;
  outcome: Outcome;
  visibleChars: number;
  quotedChars: number;
  markers: string[];
  error?: string;
};

/** Visible text once the quote container is removed — what the reader sees. */
function measure(doc: Document): { visibleChars: number; quotedChars: number } {
  const container = doc.body.querySelector(`[${QUOTED_CONTENT_ATTRIBUTE}]`);
  const quotedChars = (container?.textContent ?? '').replace(/\s+/g, ' ').trim().length;
  const total = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim().length;
  return { visibleChars: Math.max(total - quotedChars, 0), quotedChars };
}

function classify(html: string): Result {
  const markers = MARKERS.filter(([, test]) => {
    try {
      return test(html);
    } catch {
      return false;
    }
  }).map(([name]) => name);

  try {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const container = markQuotedEmailContent(doc);
    // Measured either way: for a body nothing collapsed, the visible length is
    // how much history the reader was left scrolling through.
    const { visibleChars, quotedChars } = measure(doc);
    if (!container) {
      return { id: '', outcome: 'no-quote-found', visibleChars, quotedChars, markers };
    }
    // The defect that matters: something of the sender's own ended up inside
    // the collapsed run.
    //
    // An earlier version flagged "under 40 visible characters" instead, which
    // measured the wrong thing entirely — the bodies it caught were replies
    // reading "ohh", "For real" and "whatcha doing", all collapsed correctly.
    // Terse replies are the common case in a thread, not a bug.
    const outcome: Outcome = hidesSignature(doc, container)
      ? 'collapsed-hiding-signature'
      : 'collapsed';
    return { id: '', outcome, visibleChars, quotedChars, markers };
  } catch (error) {
    return {
      id: '',
      outcome: 'error',
      visibleChars: 0,
      quotedChars: 0,
      markers,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Signature markup inside the collapsed run — the sender's own sign-off hidden
 * behind the toggle. Kept as its own list rather than imported from the
 * detector so the measurement cannot agree with the implementation by
 * construction.
 */
const SIGNATURE_SELECTORS = [
  '[class*="gmail_signature"]',
  '[class*="protonmail_signature"]',
  '[class*="moz-signature"]',
  '[id="Signature"]',
  '[id="signature"]',
].join(', ');

/**
 * The *first* signature in document order belongs to whoever wrote this
 * message; later ones belong to the quoted authors below and are supposed to be
 * hidden. Only the first ending up inside the collapsed run is a defect.
 */
function hidesSignature(doc: Document, container: Element | null): boolean {
  if (!container) return false;
  const first = doc.body.querySelector(SIGNATURE_SELECTORS);
  return first !== null && container.contains(first);
}

function parseArgs(argv: string[]) {
  const value = (flag: string) =>
    argv.indexOf(flag) >= 0 ? argv[argv.indexOf(flag) + 1] : undefined;
  return {
    corpus: value('--corpus') ?? DEFAULT_CORPUS,
    samples: Number(value('--samples') ?? DEFAULT_SAMPLES),
    skip: Number(value('--skip') ?? 0),
    limit: Number(value('--limit') ?? Number.POSITIVE_INFINITY),
    isWorker: argv.includes('--worker'),
    chunk: Number(value('--chunk') ?? DEFAULT_CHUNK),
  };
}

/**
 * Bodies per worker process.
 *
 * The corpus is analysed in chunks, each in a fresh process, because happy-dom
 * retains every document it parses: a single long-lived run grows past a
 * gigabyte and then thrashes, which looked exactly like a hang. Individual
 * chunks were always fast — 200 bodies in under two seconds — so the fix is to
 * stop asking one process to hold all seventeen thousand.
 */
const DEFAULT_CHUNK = 1500;

function percent(count: number, total: number): string {
  return total === 0 ? '0.0%' : `${((count / total) * 100).toFixed(1)}%`;
}

function table(title: string, rows: Array<[string, number]>, total: number) {
  console.log(`\n${title}`);
  const width = Math.max(...rows.map(([label]) => label.length), 10);
  for (const [label, count] of rows) {
    console.log(
      `  ${label.padEnd(width)}  ${String(count).padStart(6)}  ${percent(count, total).padStart(6)}`
    );
  }
}

/** Worker: analyse one slice of the corpus and append its rows to the JSONL. */
async function runWorker(options: ReturnType<typeof parseArgs>) {
  const { corpus, skip, limit } = options;
  // Its own file: `Bun.file().writer()` truncates, so workers sharing one path
  // overwrite each other from position zero and leave torn lines behind.
  const rows = Bun.file(partPath(detectorName, skip)).writer();
  const stream = Bun.file(corpus).stream();
  const decoder = new TextDecoder();
  let buffer = '';
  let index = 0;
  let analysed = 0;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const position = index++;
    if (position < skip || analysed >= limit) return;

    const row = JSON.parse(line) as CorpusRow;
    if (!row.bodyHtml) {
      rows.write(`${JSON.stringify({ id: row.id, outcome: 'text-only' })}\n`);
      analysed += 1;
      return;
    }

    const result = classify(row.bodyHtml);
    result.id = row.id;
    rows.write(`${JSON.stringify(result)}\n`);
    analysed += 1;
  };

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) handleLine(line);
    if (analysed >= limit) break;
  }
  if (buffer.trim() && analysed < limit) handleLine(buffer);
  await rows.end();
}

function resultsPath(name: string) {
  return `output/email-corpus/quote-analysis-${name}.jsonl`;
}

function partPath(name: string, skip: number) {
  return `output/email-corpus/quote-analysis-${name}.part-${skip}.jsonl`;
}

async function countCorpusLines(corpus: string): Promise<number> {
  const stream = Bun.file(corpus).stream();
  const decoder = new TextDecoder();
  let count = 0;
  let buffer = '';
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    count += lines.filter((line) => line.trim()).length;
  }
  if (buffer.trim()) count += 1;
  return count;
}

/** Driver: run the workers, then read their rows back and print the report. */
async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.isWorker) {
    await runWorker(options);
    return;
  }

  const { corpus, samples, chunk } = options;
  const output = resultsPath(detectorName);
  await Bun.write(output, '');

  const totalLines = await countCorpusLines(corpus);
  const parts: string[] = [];
  for (let skip = 0; skip < totalLines; skip += chunk) {
    const worker = Bun.spawn(
      [
        'bun',
        'scripts/email-corpus/analyze-quotes.ts',
        '--worker',
        '--detector',
        detectorName,
        '--corpus',
        corpus,
        '--skip',
        String(skip),
        '--limit',
        String(chunk),
      ],
      { stdout: 'inherit', stderr: 'inherit' }
    );
    const code = await worker.exited;
    if (code !== 0) {
      console.error(`worker for rows ${skip}+ exited with ${code}`);
      break;
    }

    const part = Bun.file(partPath(detectorName, skip));
    parts.push(await part.text());
    await unlink(partPath(detectorName, skip)).catch(() => {});
    console.error(`  …${Math.min(skip + chunk, totalLines)}/${totalLines} analysed`);
  }

  await Bun.write(output, parts.join(''));

  await report(output, samples);
}

async function report(path: string, samples: number) {
  const markerCounts = new Map<string, number>();
  const outcomeCounts = new Map<string, number>();
  const bucketSamples = new Map<string, Result[]>();
  const suspicious = { missed: 0, swallowed: 0, threw: 0 };
  let total = 0;
  let skipped = 0;

  const QUOTE_MARKERS = new Set([
    'gmail_quote',
    'divRplyFwdMsg',
    'yahoo_quoted',
    'moz-cite-prefix',
    'blockquote',
    '-----Original Message-----',
    'outlook border-top divider',
  ]);
  const sampleBucket = (name: string, result: Result) => {
    const bucket = bucketSamples.get(name) ?? [];
    if (bucket.length < samples) bucket.push(result);
    bucketSamples.set(name, bucket);
  };

  for (const line of (await Bun.file(path).text()).split('\n')) {
    if (!line.trim()) continue;
    const result = JSON.parse(line) as Result;
    if (result.outcome === ('text-only' as Outcome)) {
      skipped += 1;
      continue;
    }

    total += 1;
    for (const marker of result.markers ?? []) {
      markerCounts.set(marker, (markerCounts.get(marker) ?? 0) + 1);
    }
    outcomeCounts.set(result.outcome, (outcomeCounts.get(result.outcome) ?? 0) + 1);

    if (
      result.outcome === 'no-quote-found' &&
      (result.markers ?? []).some((m) => QUOTE_MARKERS.has(m))
    ) {
      suspicious.missed += 1;
      sampleBucket('markers present, nothing collapsed', result);
    }
    if (result.outcome === 'collapsed-hiding-signature') {
      suspicious.swallowed += 1;
      sampleBucket('hid the sender signature', result);
    }
    if (result.outcome === 'error') {
      suspicious.threw += 1;
      sampleBucket('threw', result);
    }
  }

  console.log(
    `\nDetector: ${detectorName}` +
      `\nAnalysed ${total} HTML bodies (${skipped} text-only, skipped)`
  );

  table(
    'Markers present in the corpus',
    [...markerCounts].sort((a, b) => b[1] - a[1]),
    total
  );
  table(
    'Detector outcome',
    [...outcomeCounts].map(([outcome, count]) => [outcome, count] as [string, number]),
    total
  );

  console.log(
    `\nSuspicious buckets` +
      `\n  quote markers present but nothing collapsed:  ${suspicious.missed}  (${percent(suspicious.missed, total)})` +
      `\n  hid the sender's own signature:               ${suspicious.swallowed}  (${percent(suspicious.swallowed, total)})` +
      `\n  threw:                                        ${suspicious.threw}`
  );

  for (const [label, rows] of bucketSamples) {
    if (rows.length === 0) continue;
    console.log(`\n  sample — ${label}`);
    for (const row of rows) {
      const detail = row.error ? ` error=${row.error}` : ` visible=${row.visibleChars}`;
      console.log(`    ${row.id}${detail}  [${(row.markers ?? []).join(', ')}]`);
    }
  }

  console.log(`\nPer-body results in ${path}`);
}

await main();
