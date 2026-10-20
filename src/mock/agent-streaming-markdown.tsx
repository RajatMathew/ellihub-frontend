import { cn } from '@/app/lib/utils';
import { motion } from 'motion/react';

import { enterTransition } from './agent-motion';
import { splitMarkdownBlocks } from './agent-stream-text';
import { MessageResponse } from './ai-elements/message';
import { useSmoothText } from './use-smooth-text';

// A light blur rather than a heavy one: each new block should read as
// arriving, not as coming into focus, and it shares the panel's enter timing
// (elli-ui#649) so text, steps and cards all settle at the same pace.
const BLOCK_ENTER = { opacity: 0, y: 3, filter: 'blur(2px)' };
const BLOCK_SETTLED = { opacity: 1, y: 0, filter: 'blur(0px)' };

/**
 * Elliot's reply, revealed smoothly while it streams (elli-ui#1343).
 *
 * The text is split into markdown blocks so only the block still being written
 * re-parses each frame — `MessageResponse` is memoized on its string, and a
 * finished block's string never changes again. A block that appears while the
 * reply is streaming settles in from a soft blur; one that was already there
 * when the reply rendered (a reloaded conversation) just shows.
 */
export function AgentStreamingMarkdown({
  text,
  streaming,
  className,
}: {
  text: string;
  streaming: boolean;
  className?: string;
}) {
  const visible = useSmoothText(text, streaming);
  const blocks = splitMarkdownBlocks(visible);

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {blocks.map((block, index) => (
        <motion.div
          // Blocks only ever append, so the index is a stable identity.
          key={index}
          initial={streaming ? BLOCK_ENTER : false}
          animate={BLOCK_SETTLED}
          transition={enterTransition}
        >
          <MessageResponse>{block}</MessageResponse>
        </motion.div>
      ))}
    </div>
  );
}
