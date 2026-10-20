import { ArrowDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useStickToBottomContext } from 'use-stick-to-bottom';

import { enterTransition, exitTransition } from './agent-motion';

/**
 * A small "back to the latest" button that rises in once the reader has
 * scrolled away from the end of the conversation (elli-ui#649) — the panel
 * stops following a streaming reply as soon as they scroll up, and without this
 * the only way back was to scroll the whole way down by hand.
 *
 * It scales in from 0.9 rather than from nothing, and leaves faster than it
 * arrives. Must sit inside the `Conversation` (StickToBottom) tree.
 */
export function AgentJumpToLatest({ streaming }: { streaming: boolean }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  return (
    <AnimatePresence initial={false}>
      {isAtBottom ? null : (
        <motion.button
          key="jump"
          type="button"
          onClick={() => void scrollToBottom()}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: enterTransition }}
          exit={{ opacity: 0, y: 4, scale: 0.95, transition: exitTransition }}
          className="absolute bottom-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-2 pr-2.5 text-xs font-medium text-muted-foreground shadow-sm transition-[color,scale] duration-150 ease-out hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-97"
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
          {streaming ? 'Elliot is replying' : 'Jump to latest'}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
