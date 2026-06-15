import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { getInitials } from '@/app/lib/helpers';
import { Mail, Phone } from 'lucide-react';

export function ContactCard({
  fullName,
  email,
  phone,
  isPrimary,
}: {
  fullName: string;
  email: string | null;
  phone: string | null;
  isPrimary?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Avatar className="size-10">
        <AvatarFallback className="text-xs font-semibold">
          {getInitials(fullName, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="break-words text-sm font-semibold text-foreground">{fullName}</span>
          {isPrimary && (
            <Badge variant="success" appearance="light" size="sm">
              Primary
            </Badge>
          )}
        </div>
        {email && (
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <Mail className="size-3 shrink-0 text-muted-foreground" />
            <a
              href={`mailto:${email}`}
              className="min-w-0 break-all text-xs text-muted-foreground hover:text-primary"
            >
              {email}
            </a>
          </div>
        )}
        {phone && (
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <Phone className="size-3 shrink-0 text-muted-foreground" />
            <a
              href={`tel:${phone}`}
              className="break-words text-xs text-muted-foreground hover:text-primary"
            >
              {phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
