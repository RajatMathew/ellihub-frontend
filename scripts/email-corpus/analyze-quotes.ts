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

type Outcome =
  | 'no-quote-found'
  | 'collapsed'
  | 'collapsed-almost-everything'
  | 'error';

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
    // Under ~40 visible characters means the toggle is hiding essentially the
    // whole message — a reader sees a near-empty card and a dot pill.
    const outcome: Outcome =
      visibleChars < 40 ? 'collapsed-almost-everything' : 'collapsed';
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

function parseArgs(argv: string[]) {
  const corpusIndex = argv.indexOf('--corpus');
  const samplesIndex = argv.indexOf('--samples');
  return {
    corpus: corpusIndex >= 0 ? (argv[corpusIndex + 1] ?? DEFAULT_CORPUS) : DEFAULT_CORPUS,
    samples: samplesIndex >= 0 ? Number(argv[samplesIndex + 1]) : DEFAULT_SAMPLES,
  };
}

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

async function main() {
  const { corpus, samples } = parseArgs(process.argv.slice(2));

  // Counters and bounded samples only. An earlier version retained a result
  // object per body and was killed by the OS partway through the corpus.
  const markerCounts = new Map<string, number>();
  const outcomeCounts = new Map<Outcome, number>();
  const bucketSamples = new Map<string, Result[]>();
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
  const suspicious = { missed: 0, swallowed: 0, threw: 0 };

  const report = Bun.file(`output/email-corpus/quote-analysis-${detectorName}.jsonl`).writer();

  const file = Bun.file(corpus);
  const stream = file.stream();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const row = JSON.parse(line) as CorpusRow;
    const html = row.bodyHtml;
    if (!html) {
      skipped += 1;
      return;
    }

    const result = classify(html);
    result.id = row.id;
    total += 1;

    for (const marker of result.markers) {
      markerCounts.set(marker, (markerCounts.get(marker) ?? 0) + 1);
    }
    outcomeCounts.set(result.outcome, (outcomeCounts.get(result.outcome) ?? 0) + 1);

    if (result.outcome === 'no-quote-found' && result.markers.some((m) => QUOTE_MARKERS.has(m))) {
      suspicious.missed += 1;
      sampleBucket('markers present, nothing collapsed', result);
    }
    if (result.outcome === 'collapsed-almost-everything') {
      suspicious.swallowed += 1;
      sampleBucket('collapsed almost everything', result);
    }
    if (result.outcome === 'error') {
      suspicious.threw += 1;
      sampleBucket('threw', result);
    }

    report.write(
      `${JSON.stringify({
        id: result.id,
        outcome: result.outcome,
        visibleChars: result.visibleChars,
        quotedChars: result.quotedChars,
      })}\n`
    );

    if (total % 2000 === 0) console.error(`  …${total} analysed`);
  };

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) handleLine(line);
  }
  if (buffer.trim()) handleLine(buffer);
  await report.end();

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
      `\n  collapsed almost the whole message:           ${suspicious.swallowed}  (${percent(suspicious.swallowed, total)})` +
      `\n  threw:                                        ${suspicious.threw}`
  );

  for (const [label, rows] of bucketSamples) {
    if (rows.length === 0) continue;
    console.log(`\n  sample — ${label}`);
    for (const row of rows) {
      const detail = row.error ? ` error=${row.error}` : ` visible=${row.visibleChars}`;
      console.log(`    ${row.id}${detail}  [${row.markers.join(', ')}]`);
    }
  }

  console.log(`\nPer-body results written to output/email-corpus/quote-analysis-${detectorName}.jsonl`);
}

await main();
