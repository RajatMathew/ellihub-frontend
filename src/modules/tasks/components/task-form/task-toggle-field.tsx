import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group';
import { cn } from '@/app/lib/utils';
import {
  segmentedDotClassName,
  segmentedItemClassName,
  segmentedTrackClassName,
  type TaskFormDensity,
} from '@/modules/tasks/components/task-form/task-form-layout';

export interface TaskToggleOption<T extends string> {
  value: T;
  /** What the segment says. Short — three of these sit side by side. */
  label: string;
  /** A background token for the dot, e.g. `bg-destructive`. */
  tone: string;
}

/**
 * A segmented control for a short, fixed set of choices.
 *
 * Priority and Ball-in-court are the same control with different words, so they
 * are one component. Built on the vendored `ToggleGroup` — the reason it is
 * wrapped at all is the `onValueChange` guard below, which every caller would
 * otherwise have to remember.
 */
export function TaskToggleField<T extends string>({
  options,
  value,
  onChange,
  label,
  density = 'comfortable',
  className,
}: {
  options: readonly TaskToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for a screen reader; the visible label is the field's own. */
  label: string;
  density?: TaskFormDensity;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      size={density === 'comfortable' ? 'lg' : 'md'}
      value={value}
      aria-label={label}
      // Radix clears the value when you press the segment that is already on.
      // These are required choices with no empty state, so an empty result is
      // dropped rather than applied.
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className={cn(segmentedTrackClassName(density), className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={segmentedItemClassName(density)}
        >
          <span className={cn(segmentedDotClassName, option.tone)} aria-hidden="true" />
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
