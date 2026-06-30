import type { ReactNode } from 'react';

import { ArrowRight, CheckCircle2, PlugZap } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { useSession } from '@/app/api';
import { Button } from '@/app/components/ui/button';

const QUICKBOOKS_INTEGRATION_PATH = '/app/settings/integrations';
const SIGN_IN_TO_QUICKBOOKS = `/sign-in?next=${encodeURIComponent(QUICKBOOKS_INTEGRATION_PATH)}`;

function QuickBooksPublicPage({
  icon,
  title,
  description,
  actionLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
}) {
  const { data } = useSession();
  const isSignedIn = Boolean(data?.session);
  const to = isSignedIn ? QUICKBOOKS_INTEGRATION_PATH : SIGN_IN_TO_QUICKBOOKS;
  const label = isSignedIn ? 'Go to integrations' : actionLabel;

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-muted text-foreground">
        {icon}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <Button asChild className="w-full">
        <Link to={to}>
          {label}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

export function QuickBooksConnectPage() {
  return (
    <QuickBooksPublicPage
      icon={<PlugZap className="size-6" />}
      title="Connect QuickBooks"
      description="Sign in to Elli to connect or reconnect your QuickBooks Online company."
      actionLabel="Sign in to continue"
    />
  );
}

export function QuickBooksDisconnectedPage() {
  const [searchParams] = useSearchParams();
  const realmId = searchParams.get('realmId');

  const description = realmId
    ? `QuickBooks Online company (${realmId}) has been disconnected. Sign in to Elli to review the connection status or reconnect.`
    : 'Your QuickBooks Online company connection has been disconnected. Sign in to Elli to review the connection status or reconnect.';

  return (
    <QuickBooksPublicPage
      icon={<CheckCircle2 className="size-6" />}
      title="QuickBooks Disconnected"
      description={description}
      actionLabel="Sign in to reconnect"
    />
  );
}
