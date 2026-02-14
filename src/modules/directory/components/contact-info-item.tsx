import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';

import { Badge } from '@app/components/ui/badge';

interface ContactInfoItemProps {
  icon: LucideIcon;
  value: string;
  label: string;
  onRemove?: () => void;
}

export function ContactInfoItem({ icon: Icon, value, label, onRemove }: ContactInfoItemProps) {
  return (
    <div className="group flex items-center gap-3">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-sm text-foreground">{value}</span>
      <Badge variant="secondary" appearance="light" size="xs">
        {label}
      </Badge>
      {onRemove && (
        <button
          type="button"
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X className="size-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </div>
  );
}
