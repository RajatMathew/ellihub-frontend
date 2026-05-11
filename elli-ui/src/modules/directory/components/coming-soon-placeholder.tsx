import type { ComponentType } from 'react';

export function ComingSoonPlaceholder({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Icon className="size-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">
        This feature will be available in a future update.
      </p>
    </div>
  );
}
