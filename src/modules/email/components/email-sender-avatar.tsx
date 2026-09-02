import { useState } from 'react';

import { cn } from '@/app/lib/utils';
import { getSenderPhotoUrl } from '@/modules/email/api/email.api';
import { getOutlookAvatarStyle, getOutlookInitials } from '@/modules/email/lib/outlook-avatar';

// Photo URLs that already 404'd this session — skip re-requesting them on
// every re-render, since browsers do not cache 404 responses.
const failedSenderPhotoUrls = new Set<string>();

/**
 * Outlook-style sender avatar: the exact Fluent colour + initials fallback,
 * overlaid by the person's real profile photo when the provider has one.
 */
export function SenderAvatar({
  name,
  email,
  accountId,
  className,
}: {
  name: string;
  email?: string;
  accountId?: string;
  className?: string;
}) {
  const photoUrl = accountId && email ? getSenderPhotoUrl(accountId, email) : null;
  const [failed, setFailed] = useState(false);
  const showPhoto = photoUrl !== null && !failed && !failedSenderPhotoUrls.has(photoUrl);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold',
        className
      )}
      // Exact Outlook avatar colours — see outlook-avatar.ts.
      style={getOutlookAvatarStyle(name)}
    >
      {getOutlookInitials(name) || '?'}
      {showPhoto && (
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => {
            failedSenderPhotoUrls.add(photoUrl);
            setFailed(true);
          }}
        />
      )}
    </span>
  );
}
