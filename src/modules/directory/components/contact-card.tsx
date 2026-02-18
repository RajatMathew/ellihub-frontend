import { Mail, Phone } from 'lucide-react';

import { Avatar, AvatarFallback } from '@app/components/ui/avatar';
import { Badge } from '@app/components/ui/badge';
import { getInitials } from '@app/lib/helpers';

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
    <div className="flex items-start gap-3">
      <Avatar className="size-10">
        <AvatarFallback className="text-xs font-semibold">
          {getInitials(fullName, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {fullName}
          </span>
          {isPrimary && (
            <Badge variant="success" appearance="light" size="sm">
              Primary
            </Badge>
          )}
        </div>
        {email && (
          <div className="flex items-center gap-1.5 mt-1">
            <Mail className="size-3 text-muted-foreground" />
            <a
              href={`mailto:${email}`}
              className="text-xs text-muted-foreground hover:text-primary truncate"
            >
              {email}
            </a>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Phone className="size-3 text-muted-foreground" />
            <a
              href={`tel:${phone}`}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              {phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
