import { Button } from '@/app/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';

/**
 * A faint hover hint for any control. Two shapes:
 *
 * - `<Hint label="…">…</Hint>` wraps a control that already owns its click
 *   (a Select, a Popover trigger, a ToggleGroup item) in a neutral inline
 *   span, so two triggers never fight over one element.
 * - `<HintButton hint="…" …buttonProps />` is a Button that is its own
 *   trigger -- the common case for plain buttons.
 *
 * Both need a `TooltipProvider` above them. Composition only: the tooltip
 * styling itself lives in `ui/tooltip.tsx`.
 */
export function Hint({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function HintButton({
  hint,
  ...button
}: { hint: React.ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...button} />
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}
