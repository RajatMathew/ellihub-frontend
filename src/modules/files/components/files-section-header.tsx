import { Lock, Share2 } from 'lucide-react';

interface FilesSectionHeaderProps {
  type: 'protected' | 'shared';
  count: number;
}

export function FilesSectionHeader({ type, count }: FilesSectionHeaderProps) {
  const Icon = type === 'protected' ? Lock : Share2;
  const label = type === 'protected' ? 'Protected' : 'Shared';

  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-2sm font-semibold text-foreground">{label}</span>
      <span className="text-2sm text-muted-foreground">{count}</span>
    </div>
  );
}
