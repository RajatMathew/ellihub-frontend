import { forwardRef, useEffect, useRef } from 'react';

import { cn } from '@app/lib/utils';

/**
 * Find the nearest scrollable ancestor of an element.
 */
function getScrollParent(el: HTMLElement): HTMLElement {
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll|overlay)/.test(style.overflowY)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement;
}

export const FormSectionNav = forwardRef<
  HTMLElement,
  {
    sections: readonly { id: string; label: string }[];
    activeSection: string;
    onSectionChange: (id: string) => void;
    className?: string;
    scrollOffset?: number;
    top?: number | string;
    density?: 'default' | 'compact';
    appearance?: 'pills' | 'stepper';
  }
>(
  (
    {
      sections,
      activeSection,
      onSectionChange,
      className,
      scrollOffset,
      top,
      density = 'default',
      appearance = 'pills',
    },
    ref
  ) => {
    const internalRef = useRef<HTMLElement>(null);
    const navRef = (ref as React.RefObject<HTMLElement>) || internalRef;
    const onChangeRef = useRef(onSectionChange);

    useEffect(() => {
      onChangeRef.current = onSectionChange;
    }, [onSectionChange]);

    useEffect(() => {
      if (!navRef.current) return;

      const scrollContainer = getScrollParent(navRef.current);
      const elements = sections
        .map((section) => document.getElementById(section.id))
        .filter((el): el is HTMLElement => el !== null);

      if (elements.length === 0) return;

      let animationFrame = 0;
      const isDocumentScroll = scrollContainer === document.documentElement;
      const scrollElement = isDocumentScroll ? document.documentElement : scrollContainer;
      const scrollEventTarget: HTMLElement | Window = isDocumentScroll ? window : scrollContainer;

      const syncActiveSection = () => {
        animationFrame = 0;

        const offset = scrollOffset ?? navRef.current?.offsetHeight ?? 0;
        const rootTop = isDocumentScroll ? 0 : scrollContainer.getBoundingClientRect().top;
        const viewportTop = rootTop + offset;
        const viewportBottom = rootTop + scrollElement.clientHeight;
        const atScrollEnd =
          Math.ceil(scrollElement.scrollTop + scrollElement.clientHeight) >=
          scrollElement.scrollHeight - 2;

        if (atScrollEnd) {
          onChangeRef.current(elements[elements.length - 1].id);
          return;
        }

        let activeId = elements[0].id;
        let maxVisibleHeight = 0;

        for (const element of elements) {
          const rect = element.getBoundingClientRect();
          const visibleTop = Math.max(rect.top, viewportTop);
          const visibleBottom = Math.min(rect.bottom, viewportBottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);

          if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            activeId = element.id;
          }
        }

        onChangeRef.current(activeId);
      };

      const scheduleSync = () => {
        if (animationFrame) return;
        animationFrame = requestAnimationFrame(syncActiveSection);
      };

      syncActiveSection();
      scrollEventTarget.addEventListener('scroll', scheduleSync, { passive: true });
      window.addEventListener('resize', scheduleSync);

      return () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        scrollEventTarget.removeEventListener('scroll', scheduleSync);
        window.removeEventListener('resize', scheduleSync);
      };
    }, [sections, scrollOffset, navRef]);

    const handleClick = (id: string) => {
      if (!navRef.current) return;

      const target = document.getElementById(id);
      if (!target) return;

      onSectionChange(id);

      const navHeight = scrollOffset ?? navRef.current.offsetHeight;
      const previousScrollMarginTop = target.style.scrollMarginTop;

      target.style.scrollMarginTop = `${navHeight + 8}px`;
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });

      setTimeout(() => {
        target.style.scrollMarginTop = previousScrollMarginTop;
      }, 800);
    };

    const activeIndex = sections.findIndex((s) => s.id === activeSection);

    const renderPillSections = () =>
      sections.map((section, i) => {
        const isActive = activeSection === section.id;
        const isPast = i < activeIndex;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => handleClick(section.id)}
            className={cn(
              'group relative flex min-w-fit flex-none items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 sm:flex-1',
              density === 'compact' && 'px-3 py-1.5',
              isActive
                ? 'border border-primary bg-primary/5 text-primary'
                : isPast
                  ? 'text-foreground hover:bg-accent'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-200',
                density === 'compact' && 'size-4 text-[10px]',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : isPast
                    ? 'bg-primary/10 text-primary'
                    : 'bg-background text-muted-foreground group-hover:bg-accent-foreground/10'
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0 truncate">{section.label}</span>
          </button>
        );
      });

    const renderStepperSections = () =>
      sections.map((section, i) => {
        const isActive = activeSection === section.id;

        return (
          <div
            key={section.id}
            className="flex min-w-fit shrink-0 items-center gap-3 lg:min-w-0 lg:flex-1 lg:gap-6"
          >
            <button
              type="button"
              onClick={() => handleClick(section.id)}
              className={cn(
                'group relative flex min-w-0 max-w-[min(12rem,72vw)] shrink-0 items-center justify-start gap-2 py-2 text-xs font-medium transition-all duration-200 lg:max-w-none',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted-foreground/60 text-background'
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 truncate">{section.label}</span>
            </button>
            {i < sections.length - 1 && (
              <span className="hidden h-px min-w-10 flex-1 bg-border lg:block" />
            )}
          </div>
        );
      });

    return (
      <nav
        ref={navRef}
        className={cn(
          'sticky top-0 z-10 -mx-4 max-w-[calc(100%+2rem)] overflow-x-clip bg-background/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:max-w-[calc(100%+3rem)] sm:px-6 lg:-mx-7.5 lg:max-w-[calc(100%+3.75rem)] lg:px-7.5',
          density === 'compact' && 'py-2',
          className
        )}
        style={top !== undefined ? { top } : undefined}
      >
        <div
          className={cn(
            'flex min-w-0 max-w-full items-center',
            appearance === 'stepper'
              ? 'flex-wrap gap-3 px-1 py-0.5 lg:flex-nowrap lg:gap-6 lg:px-0'
              : 'flex-wrap gap-2 px-1 py-0.5 sm:px-0'
          )}
        >
          {appearance === 'stepper' ? renderStepperSections() : renderPillSections()}
        </div>
      </nav>
    );
  }
);
