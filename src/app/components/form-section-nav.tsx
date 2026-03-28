import { forwardRef, useEffect, useRef } from 'react';

import { cn } from '@app/lib/utils';

/**
 * Find the nearest scrollable ancestor of an element.
 */
function getScrollParent(el: HTMLElement): HTMLElement {
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll)/.test(style.overflow + style.overflowY)) {
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
  }
>(({ sections, activeSection, onSectionChange, className, scrollOffset, top }, ref) => {
  const isClickScrolling = useRef(false);
  const internalRef = useRef<HTMLElement>(null);
  const navRef = (ref as React.RefObject<HTMLElement>) || internalRef;
  const onChangeRef = useRef(onSectionChange);
  onChangeRef.current = onSectionChange;

  useEffect(() => {
    if (!navRef.current) return;

    const scrollContainer = getScrollParent(navRef.current);

    const ids = sections.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0 && visible[0].target.id) {
          onChangeRef.current(visible[0].target.id);
        }
      },
      {
        root: scrollContainer === document.documentElement ? null : scrollContainer,
        rootMargin: '-48px 0px -60% 0px',
        threshold: 0,
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections, scrollOffset, navRef]);

  const handleClick = (id: string) => {
    if (!navRef.current) return;

    const target = document.getElementById(id);
    if (!target) return;

    onSectionChange(id);
    isClickScrolling.current = true;

    const scrollContainer = getScrollParent(navRef.current);
    const navHeight = scrollOffset ?? navRef.current.offsetHeight;

    const targetTop = target.getBoundingClientRect().top;
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const finalScrollPos = scrollContainer.scrollTop + (targetTop - containerTop) - navHeight - 8;

    scrollContainer.scrollTo({ top: finalScrollPos, behavior: 'smooth' });

    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  const activeIndex = sections.findIndex((s) => s.id === activeSection);

  return (
    <nav
      ref={navRef}
      className={cn(
        'sticky top-0 z-10 -mx-4 px-4 lg:-mx-7.5 lg:px-7.5 py-3 bg-zinc-50/95 backdrop-blur-md',
        className,
      )}
      style={top !== undefined ? { top } : undefined}
    >
      <div className="flex items-center w-full gap-2">
        {sections.map((section, i) => {
          const isActive = activeSection === section.id;
          const isPast = i < activeIndex;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => handleClick(section.id)}
              className={cn(
                'group relative flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'border border-primary text-primary bg-primary/5'
                  : isPast
                    ? 'text-foreground hover:bg-accent'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center size-5 rounded-full text-[11px] font-semibold shrink-0 transition-colors duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : isPast
                      ? 'bg-primary/10 text-primary'
                      : 'bg-background text-muted-foreground group-hover:bg-accent-foreground/10',
                )}
              >
                {i + 1}
              </span>
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
});
