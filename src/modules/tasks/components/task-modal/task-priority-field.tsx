import { cn } from '@/app/lib/utils';
import type { TaskPriority } from '@/modules/tasks/schemas/task.schema';

const LEVELS: Array<{ value: TaskPriority; lit: number }> = [
  { value: 'P1', lit: 3 },
  { value: 'P2', lit: 2 },
  { value: 'P3', lit: 1 },
];

/** P1 / P2 / P3 as one segmented control, each with its signal bars. */
export function TaskPriorityField({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (next: TaskPriority) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Priority"
      className="ml-1 inline-flex gap-0.5 rounded-xl bg-accent p-0.5"
    >
      {LEVELS.map((level) => {
        const on = value === level.value;
        return (
          <button
            key={level.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(level.value)}
            className={cn(
              'cursor-pointer disabled:cursor-not-allowed inline-flex h-7 items-center gap-1.5 rounded-lg pl-2 pr-2.5 text-[13px] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              on
                ? 'bg-popover text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PriorityBars lit={level.lit} urgent={level.value === 'P1'} />
            {level.value}
          </button>
        );
      })}
    </div>
  );
}

function PriorityBars({ lit, urgent }: { lit: number; urgent: boolean }) {
  const bars: Array<[number, number, number]> = [
    [1.5, 9, 5.5],
    [6.5, 5.5, 9],
    [11.5, 2, 12.5],
  ];
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn('size-3.5 fill-current', urgent && 'text-destructive')}
    >
      {bars.map(([x, y, height], index) => (
        <rect
          key={x}
          x={x}
          y={y}
          width="3"
          height={height}
          rx="1"
          opacity={index < lit ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}
