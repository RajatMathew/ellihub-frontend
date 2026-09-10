/**
 * Inspects one corpus body by id, for diagnosing a case the analyzer flagged.
 *
 * Prints a STRUCTURAL SKELETON by default — tag names, ids, classes, and where
 * the quote detector decided the boundary is — never the message text. The
 * corpus is real mail; structure is what a detector bug is visible in, and it
 * is the part that is safe to read, paste into a PR, or leave in a terminal.
 *
 * `--raw` prints the body itself. That is real correspondence: use it only when
 * structure genuinely is not enough, and do not copy the output anywhere.
 *
 *   bun scripts/email-corpus/show-body.ts <id> [--corpus PATH] [--depth N] [--raw]
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator';

if (typeof globalThis.document === 'undefined') GlobalRegistrator.register();

const { markQuotedEmailContent, QUOTED_CONTENT_ATTRIBUTE, QUOTE_TOGGLE_ATTRIBUTE } = await import(
  './detector-v0'
);

const DEFAULT_CORPUS = 'output/email-corpus/bodies.jsonl';

type CorpusRow = {
  id: string;
  accountId: string;
  serviceType: string;
  bodyHtml: string | null;
  bodyText: string | null;
};

function parseArgs(argv: string[]) {
  const corpusIndex = argv.indexOf('--corpus');
  const depthIndex = argv.indexOf('--depth');
  return {
    id: argv.find((value) => !value.startsWith('--') && argv.indexOf(value) === 0) ?? argv[0],
    corpus: corpusIndex >= 0 ? (argv[corpusIndex + 1] ?? DEFAULT_CORPUS) : DEFAULT_CORPUS,
    depth: depthIndex >= 0 ? Number(argv[depthIndex + 1]) : 6,
    raw: argv.includes('--raw'),
  };
}

/** `div#divRplyFwdMsg.MsoNormal` — enough to recognise a client's markup. */
function describe(element: Element): string {
  const id = element.id ? `#${element.id}` : '';
  const className = String(element.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => `.${name}`)
    .join('');
  return `${element.tagName.toLowerCase()}${id}${className}`;
}

async function findRow(corpus: string, id: string): Promise<CorpusRow | null> {
  const stream = Bun.file(corpus).stream();
  const decoder = new TextDecoder();
  let buffer = '';

  const check = (line: string): CorpusRow | null => {
    if (!line.trim()) return null;
    // Cheap pre-filter: parsing every line of a ~500 MB file is the slow part.
    if (!line.includes(`"${id}"`)) return null;
    const row = JSON.parse(line) as CorpusRow;
    return row.id === id ? row : null;
  };

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const row = check(line);
      if (row) return row;
    }
  }
  return check(buffer);
}

function printTree(node: Element, depth: number, maxDepth: number, quoteRoot: Element | null) {
  if (depth > maxDepth) return;
  const marker = node === quoteRoot ? '  ← QUOTE STARTS HERE' : '';
  const textLength = (node.textContent ?? '').replace(/\s+/g, ' ').trim().length;
  console.log(`${'  '.repeat(depth)}${describe(node)}  (${textLength} chars)${marker}`);
  for (const child of node.children) printTree(child, depth + 1, maxDepth, quoteRoot);
}

async function main() {
  const { id, corpus, depth, raw } = parseArgs(process.argv.slice(2));
  if (!id) {
    console.error('usage: bun scripts/email-corpus/show-body.ts <id> [--raw] [--depth N]');
    process.exit(1);
  }

  const row = await findRow(corpus, id);
  if (!row) {
    console.error(`No body with id ${id} in ${corpus}`);
    process.exit(1);
  }

  const html = row.bodyHtml ?? '';
  console.log(`id=${row.id}  service=${row.serviceType}  bytes=${html.length}`);

  if (raw) {
    console.log('\n--- raw body (real correspondence — do not copy) ---\n');
    console.log(html);
    return;
  }

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const container = markQuotedEmailContent(doc);
  const total = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim().length;
  const quoted = (container?.textContent ?? '').replace(/\s+/g, ' ').trim().length;

  console.log(
    `detector: ${container ? 'collapsed' : 'found no quote'}  ` +
      `visible=${total - quoted} quoted=${quoted} total=${total}`
  );

  // Re-parse so the tree shown is the original document, not the rewritten one.
  const original = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  console.log(`\nstructure (depth ${depth}):`);
  for (const child of original.body.children) printTree(child, 1, depth, null);

  if (container) {
    console.log(`\nafter marking (depth ${depth}):`);
    for (const child of doc.body.children) {
      const isQuote = child.hasAttribute(QUOTED_CONTENT_ATTRIBUTE);
      const isToggle = child.hasAttribute(QUOTE_TOGGLE_ATTRIBUTE);
      const label = isQuote ? '  ← QUOTED (hidden)' : isToggle ? '  ← ··· toggle' : '';
      const textLength = (child.textContent ?? '').replace(/\s+/g, ' ').trim().length;
      console.log(`  ${describe(child)}  (${textLength} chars)${label}`);
    }
  }
}

await main();
