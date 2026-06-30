import { useEffect, useRef } from 'react';

import { usePostHog } from '@posthog/react';

import { useSession } from '@app/api';

export function PostHogIdentity() {
  const posthog = usePostHog();
  const { data } = useSession();
  const lastIdentifiedDistinctId = useRef<string | null>(null);

  useEffect(() => {
    const user = data?.user;
    const email = user?.email?.trim();
    const distinctId = user?.id ?? email;

    if (!distinctId || lastIdentifiedDistinctId.current === distinctId) return;

    posthog.identify(distinctId, {
      email,
      name: user?.name,
      user_id: user?.id,
    });
    lastIdentifiedDistinctId.current = distinctId;
  }, [data?.user, posthog]);

  return null;
}

