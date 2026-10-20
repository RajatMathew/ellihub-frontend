import { useEffect } from 'react';

import { cn } from '@/app/lib/utils';
import { useScrollEdges } from '@/modules/tasks/hooks/use-scroll-edges';
import { motion } from 'motion/react';
import { useStickToBottomContext } from 'use-stick-to-bottom';

import { enterTransition, exitTransition, staggerDelay } from './agent-motion';

/**
 * Follow-up chips above the chat box (elli-ui#1035): one row of what the reader
 * might ask Elliot next, scrolling sideways when it does not fit. The edges fade
 * only where there is more to scroll to, so a row that fits shows no fade.
 */
export function AgentFollowUpChipRow({
  items,
  disabled,
  onPick,
  className,
}: {
  items: readonly string[];
  /** Why a chip cannot be sent right now — it still shows, so the row does not jump. */
  disabled?: string | null;
  onPick: (text: string) => void;
  className?: string;
}) {
  const { ref, scrollEdgeProps } = useScrollEdges<HTMLUListElement>();

  return (
    <motion.div
      role="group"
      aria-label="Suggested follow-ups"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: enterTransition }}
      exit={{ opacity: 0, transition: exitTransition }}
    >
      <ul
        ref={ref}
        {...scrollEdgeProps}
        className="scroll-fade-x flex gap-2 overflow-x-auto overflow-y-hidden px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((text, index) => (
          <motion.li
            key={text}
            className="shrink-0"
            // Opacity only. A slide would make the row taller than itself for
            // the length of the animation, and `useScrollEdges` — measuring
            // once, at mount — then took it for a vertical scroller and never
            // showed the fade on a row that runs off the edge.
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { ...enterTransition, delay: staggerDelay(index, { step: 0.06 }) },
            }}
          >
            <button
              type="button"
              disabled={Boolean(disabled)}
              title={disabled ?? undefined}
              onClick={() => onPick(text)}
              className={cn(
                'inline-flex h-8 items-center whitespace-nowrap rounded-full border border-border bg-card px-3.5 text-xs font-medium text-foreground shadow-xs',
                'transition-colors hover:border-primary/30 hover:bg-accent',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:pointer-events-none disabled:opacity-50'
              )}
            >
              {text}
            </button>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/**
 * Keeps the latest answer in view when the chips arrive. The row takes its
 * height out of the conversation, and the conversation only follows its own
 * content growing — not itself shrinking — so without this the bottom of the
 * answer (an Approve button, as often as not) slid behind the chips. Only when
 * the reader was already at the bottom; someone scrolled up stays put.
 */
export function KeepLatestAnswerInView({ trigger }: { trigger: string | null }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  useEffect(() => {
    if (trigger && isAtBottom) void scrollToBottom();
    // Only on a new row: following `isAtBottom` would pull the reader back down
    // every time they scroll to the end and away again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}
