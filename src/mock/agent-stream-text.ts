/**
 * How Elliot's reply is let onto the screen while it streams (elli-ui#1343).
 *
 * The model sends text in bursts — nothing for 300ms, then forty characters at
 * once. Rendered as it arrives, the reply lurches. Instead the reader is shown
 * a cursor that advances every frame toward whatever has arrived: at least a
 * steady reading pace, faster the further it has fallen behind, so a burst is
 * spread over the next few frames rather than painted in one.
 *
 * Pure, so the pacing is testable without a clock or a renderer.
 */

/** The slowest the reveal ever moves while there is text waiting. */
export const MIN_CHARS_PER_SECOND = 70;
/**
 * While streaming, the reveal's time constant: any backlog is halved within
 * this long, so the reader is never more than about this far behind the model.
 * Short enough that the reply does not feel held back, long enough to spread
 * a burst over several frames.
 */
export const STREAMING_CATCH_UP_MS = 250;
/** Once the stream has ended, finish briskly rather than keep typing. */
export const FINISHED_CATCH_UP_MS = 60;
export const FINISHED_MIN_CHARS_PER_SECOND = 400;
/** A frame longer than this (a background tab) is treated as this long. */
const MAX_FRAME_MS = 64;

export function nextRevealLength({
  shown,
  target,
  elapsedMs,
  streaming,
}: {
  shown: number;
  target: number;
  elapsedMs: number;
  streaming: boolean;
}): number {
  // The text was replaced by a shorter one (a retry, a regenerated reply):
  // there is nothing to animate toward, so show it as it is.
  if (target <= shown) return target;

  const elapsed = Math.min(Math.max(elapsedMs, 0), MAX_FRAME_MS);
  const backlog = target - shown;
  const catchUpMs = streaming ? STREAMING_CATCH_UP_MS : FINISHED_CATCH_UP_MS;
  const minPace = streaming ? MIN_CHARS_PER_SECOND : FINISHED_MIN_CHARS_PER_SECOND;
  const steady = (minPace * elapsed) / 1000;
  const catchUp = (backlog * elapsed) / catchUpMs;
  const step = Math.max(1, Math.ceil(Math.max(steady, catchUp)));
  return Math.min(target, shown + step);
}

/**
 * Splits markdown into its top-level blocks, so a streaming reply re-parses only
 * the block still being written. Every finished block keeps the same string and
 * so the same memoized render; without this, every frame re-parsed the whole
 * reply, which is what made long answers stutter.
 *
 * A block ends at a blank line, except:
 * - inside a fenced code block, where blank lines belong to the code;
 * - before an indented line, which continues the list item above it — split
 *   there, it would render as a code block of its own.
 *
 * Joining the blocks with a blank line gives back markdown that renders the
 * same as the input.
 */
export function splitMarkdownBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;
  let pendingBreak = false;

  const flush = () => {
    if (current.length) blocks.push(current.join('\n'));
    current = [];
  };

  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;

    if (!inFence && line.trim() === '') {
      pendingBreak = current.length > 0;
      continue;
    }

    if (pendingBreak) {
      pendingBreak = false;
      if (/^\s{2,}\S/.test(line)) {
        // An indented continuation: keep the blank line, stay in the block.
        current.push('');
      } else {
        flush();
      }
    }
    current.push(line);
  }
  flush();
  return blocks;
}

/**
 * What a card field shows of text still streaming into it (elli-ui#1482):
 * whole words only. The word still arriving waits for the space after it, so
 * each word fades in once, complete, instead of growing a letter at a time.
 */
export function wholeWordsOf(text: string, streaming: boolean): string {
  if (!streaming) return text;
  return text.slice(0, text.search(/\S*$/));
}

/**
 * A field's text as the pieces that fade in — each word with the whitespace
 * after it, and any leading whitespace on its own. Joined, they are the text.
 */
export function splitWords(text: string): string[] {
  return text.match(/^\s+|\S+\s*/g) ?? [];
}
