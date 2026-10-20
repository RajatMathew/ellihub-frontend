import type { Ref } from 'react';

import { Button } from '@/app/components/ui/button';
import { useLayout } from '@/app/hooks/use-layout';

/** Opens and closes Elliot from the app header, beside Feedback. */
export function ElliotHeaderButton({
  open,
  onClick,
  ref,
}: {
  open: boolean;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const { isMobile } = useLayout();
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size={isMobile ? 'icon' : 'sm'}
      aria-label="Open or close Elliot Agent"
      aria-pressed={open}
      data-state={open ? 'open' : 'closed'}
      title="Open or close Elliot Agent (Shift + E)"
      onClick={onClick}
      className="gap-1.5 bg-transparent p-0 text-sm lg:px-3 lg:py-4 font-semibold text-primary hover:bg-(--header-action-hover-background) hover:text-primary hover:duration-100 data-[state=open]:bg-(--header-action-hover-background) focus-visible:bg-(--header-action-hover-background)"
    >
      <img
        src="/favicon/apple-touch-icon.png"
        alt=""
        aria-hidden="true"
        className="size-5 shrink-0 rounded-[5px] object-contain lg:size-4 lg:rounded-[4px]"
      />
      {!isMobile && <span>Elliot</span>}
    </Button>
  );
}
