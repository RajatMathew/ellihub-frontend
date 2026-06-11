import { Badge } from '@/app/components/ui/badge';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';

interface ContactInfoItemProps {
  icon: LucideIcon;
  value: string;
  label: string;
  onRemove?: () => void;
}

export function ContactInfoItem({ icon: Icon, value, label, onRemove }: ContactInfoItemProps) {
  return (
    <div className="group flex min-w-0 items-start gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 break-words text-sm text-foreground">{value}</span>
      <Badge variant="secondary" appearance="light" size="xs">
        {label}
      </Badge>
      {onRemove && (
        <button
          type="button"
          className="ml-auto shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          <X className="size-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </div>
  );
}
