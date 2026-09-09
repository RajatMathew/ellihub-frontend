import { useState } from 'react';

import { getOutlookAvatarStyle, getOutlookInitials } from '@/app/lib/outlook-avatar';
import { cn } from '@/app/lib/utils';
import { getSenderPhotoUrl } from '@/modules/email/api/email.api';
import { useEmailAccountsQuery } from '@/modules/email/hooks/email.hooks';
import { canSenderHavePhoto } from '@/modules/email/utils/email-sender-photo';

// Photo URLs that already 404'd this session. The provider still 404s a
// same-tenant colleague who never set a photo, and this keeps that from being
// re-requested on every re-render within the session; the route's
// Cache-Control carries it across reloads.
const failedSenderPhotoUrls = new Set<string>();

/**
 * Outlook-style sender avatar: the exact Fluent colour + initials fallback,
 * overlaid by the person's real profile photo when the provider has one.
 *
 * The photo request is only made for a sender who could actually have one —
 * someone in the account's own Microsoft tenant. Every other sender was a
 * guaranteed 404 logged in DevTools once per address (elli-ui#872), so the
 * `<img>` is simply not rendered for them and the initials stand alone.
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
  const { data: accounts } = useEmailAccountsQuery();
  const account = accountId ? accounts?.find((candidate) => candidate.id === accountId) : undefined;
  // Undefined while the accounts query is in flight — initials until it lands,
  // which is the same thing the photo would have been layered on top of.
  const photoUrl =
    accountId && email && canSenderHavePhoto(account, email)
      ? getSenderPhotoUrl(accountId, email)
      : null;
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
