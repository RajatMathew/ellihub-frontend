import { useMemo, useState } from 'react';

import {
  dotMatrixDelays,
  randomDotMatrixPattern,
  type DotMatrixPattern,
} from '@/app/lib/dot-matrix';
import { cn } from '@/app/lib/utils';

/** One trip of the light round the grid. */
const CYCLE_SECONDS = 1.4;

/**
 * A small grid of dots lighting in a pattern — the app's loader where a spinner
 * would be (elli-ui#817). Each one picks a pattern at random unless told which,
 * keeps it while mounted, and draws in `currentColor`, so it takes the colour
 * of the text around it in every theme. Below 16px a 3×3 grid stays legible
 * where a 5×5 one blurs into a smudge.
 *
 * Decorative: pair it with text that says what is happening, or give it a
 * `label` when it stands alone.
 */
export function DotMatrixLoader({
  size = 16,
  pattern,
  label,
  className,
}: {
  size?: number;
  pattern?: DotMatrixPattern;
  /** Read out when the loader is the only thing saying something is happening. */
  label?: string;
  className?: string;
}) {
  const [randomPattern] = useState(randomDotMatrixPattern);
  const chosen = pattern ?? randomPattern;
  const grid = size < 16 ? 3 : 5;
  const delays = useMemo(() => dotMatrixDelays(chosen, grid), [chosen, grid]);

  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-pattern={chosen}
      className={cn('inline-grid shrink-0', className)}
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${grid}, 1fr)`,
        gap: size * (grid === 3 ? 0.18 : 0.1),
      }}
    >
      {delays.map((delay, index) => (
        <span
          key={index}
          className={cn(
            'rounded-full bg-current',
            delay === null
              ? 'opacity-20'
              : 'animate-dot-matrix opacity-30 motion-reduce:animate-none'
          )}
          style={
            delay === null
              ? undefined
              : {
                  animationDuration: `${CYCLE_SECONDS}s`,
                  animationDelay: `${(delay * CYCLE_SECONDS).toFixed(3)}s`,
                }
          }
        />
      ))}
    </span>
  );
}
