import { cn } from '@app/lib/utils';

/**
 * Sidebar header — matches the Elli Estimating sandbox treatment:
 * serif word-mark + three clay dots in an upward triangle.
 */
export const SidebarLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <h1 className="font-serif text-2xl uppercase tracking-tight text-white">
        Accounting
      </h1>
      <svg
        width="16"
        height="13"
        viewBox="0 0 18 14"
        aria-hidden="true"
        className="mt-1 flex-shrink-0"
      >
        <circle cx="9" cy="3.5" r="2.1" fill="#C75E40" />
        <circle cx="4" cy="11" r="2.1" fill="#C75E40" />
        <circle cx="14" cy="11" r="2.1" fill="#C75E40" />
      </svg>
    </div>
  );
};
