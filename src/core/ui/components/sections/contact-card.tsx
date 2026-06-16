import { Mail, Phone } from 'lucide-react';

import { Avatar, AvatarFallback } from '@app/components/ui/avatar';
import { Badge } from '@app/components/ui/badge';
import { cn } from '@app/lib/utils';

export interface ContactCardProps {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  avatar?: string;
  initials?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'info';
  className?: string;
}

export function ContactCard({
  name,
  role,
  email,
  phone,
  avatar,
  initials,
  badge,
  badgeVariant = 'primary',
  className,
}: ContactCardProps) {
  const avatarInitials =
    initials ||
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div
      className={cn(
        'flex gap-4 rounded-sm border border-gray-200 bg-background p-5 shadow-sm',
        className
      )}
    >
      {/* Avatar */}
      <Avatar className="size-12 shrink-0 rounded-sm bg-gray-100 text-gray-600">
        {avatar && <img src={avatar} alt={name} />}
        <AvatarFallback className="rounded-sm bg-gray-100 text-[15px] font-bold text-gray-600">
          {avatarInitials}
        </AvatarFallback>
      </Avatar>

      {/* Contact Info */}
      <div className="flex-1 space-y-2">
        {/* Name and Badge */}
        <div className="flex items-center gap-2">
          <h4 className="text-[15px] font-bold text-gray-900">{name}</h4>
          {badge && (
            <Badge variant={badgeVariant} size="sm" className="text-[10px] font-bold uppercase">
              {badge}
            </Badge>
          )}
        </div>

        {/* Role */}
        <div className="text-[12px] font-medium tracking-[0.03em] text-gray-500 uppercase">
          {role}
        </div>

        {/* Contact Details */}
        <div className="space-y-1.5">
          {email && (
            <div className="flex items-center gap-2 text-[13px] text-gray-600">
              <Mail className="size-3.5 text-gray-400" />
              <a href={`mailto:${email}`} className="hover:text-blue-600 hover:underline">
                {email}
              </a>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-[13px] text-gray-600">
              <Phone className="size-3.5 text-gray-400" />
              <a href={`tel:${phone}`} className="hover:text-blue-600 hover:underline">
                {phone}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
