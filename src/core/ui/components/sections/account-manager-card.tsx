import { Avatar, AvatarFallback } from '@app/components/ui/avatar';
import { cn } from '@app/lib/utils';

export interface AccountManagerCardProps {
  name: string;
  role: string;
  avatar?: string;
  initials?: string;
  className?: string;
}

export function AccountManagerCard({
  name,
  role,
  avatar,
  initials,
  className,
}: AccountManagerCardProps) {
  const avatarInitials =
    initials ||
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className={cn('flex items-center gap-3 rounded-sm bg-gray-100 p-3', className)}>
      <Avatar className="size-10 shrink-0 rounded-sm bg-gray-200 text-gray-600">
        {avatar && <img src={avatar} alt={name} />}
        <AvatarFallback className="rounded-sm bg-gray-200 text-[13px] font-bold text-gray-500">
          {avatarInitials}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-0.5">
        <div className="text-[13px] font-bold text-gray-900 dark:text-white">{name}</div>
        <div className="text-[12px] font-medium tracking-wide text-gray-500 uppercase">{role}</div>
      </div>
    </div>
  );
}
