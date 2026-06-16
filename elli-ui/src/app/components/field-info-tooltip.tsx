import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import { Info } from 'lucide-react';

interface FieldInfoTooltipProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
  contentClassName?: string;
}

export function FieldInfoTooltip({
  children,
  label = 'Field information',
  className,
  contentClassName,
}: FieldInfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-transparent text-sky-600 transition-colors hover:cursor-pointer hover:text-sky-700 focus-visible:ring-[3px] focus-visible:ring-sky-500/25 focus-visible:outline-none',
            className
          )}
          aria-label={label}
        >
          <Info className="size-4" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={8}
        showArrow
        arrowClassName="fill-zinc-950"
        className={cn(
          'w-96 max-w-[min(24rem,calc(100vw-2rem))] rounded-md border-0 bg-zinc-950 px-3 py-2 text-left text-xs leading-relaxed font-normal tracking-normal text-white normal-case shadow-xl shadow-black/20 ring-0 outline-none',
          contentClassName
        )}
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
