import { useState } from 'react';

import { AlertTriangle, ExternalLink, Plug, Power, Settings2, ShieldAlert } from 'lucide-react';

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/app/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
  CardTitle,
  CardToolbar,
} from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import type { QuickBooksStatus } from '@/modules/integrations/schemas/quickbooks.schema';

type QuickBooksStatusCardProps = {
  status: QuickBooksStatus;
  isConnecting: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

const formatDateTime = (value: string | null): string => {
  if (!value) return '-';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getConnectionBadge = (status: QuickBooksStatus) => {
  if (!status.configured) {
    return { label: 'Config needed', variant: 'warning' as const };
  }

  if (status.connection?.status === 'CONNECTED') {
    return { label: 'Connected', variant: 'success' as const };
  }

  return { label: 'Not connected', variant: 'secondary' as const };
};

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </div>
      <div className="break-words text-sm font-medium">{value}</div>
    </div>
  );
}

function TokenHealthAlert({ tokenHealth }: { tokenHealth: string }) {
  if (tokenHealth === 'expired') {
    return (
      <Alert variant="destructive" appearance="light">
        <AlertIcon>
          <ShieldAlert className="size-5" />
        </AlertIcon>
        <AlertContent>
          <AlertTitle>Refresh token expired</AlertTitle>
          <AlertDescription>
            Reconnect QuickBooks to restore Elli's access to the selected company.
          </AlertDescription>
        </AlertContent>
      </Alert>
    );
  }

  if (tokenHealth === 'expiring') {
    return (
      <Alert variant="warning" appearance="light">
        <AlertIcon>
          <AlertTriangle className="size-5" />
        </AlertIcon>
        <AlertContent>
          <AlertTitle>Refresh token expiring soon</AlertTitle>
          <AlertDescription>
            Reconnect within 14 days to keep QuickBooks access active.
          </AlertDescription>
        </AlertContent>
      </Alert>
    );
  }

  return null;
}

export function QuickBooksStatusCard({
  status,
  isConnecting,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: QuickBooksStatusCardProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const badge = getConnectionBadge(status);
  const connection = status.connection;

  const handleDisconnectConfirm = () => {
    setShowDisconnectDialog(false);
    onDisconnect();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardHeading>
            <CardTitle>QuickBooks Online</CardTitle>
            <CardDescription>Accounting connection</CardDescription>
          </CardHeading>
          <CardToolbar className="flex-wrap">
            <Badge variant={badge.variant} appearance="light">
              {badge.label}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-3.5" />
                Docs
              </a>
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardContent className="space-y-5">
          {!status.configured && (
            <Alert variant="warning" appearance="light">
              <AlertIcon>
                <Settings2 className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>Missing backend configuration</AlertTitle>
                <AlertDescription>{status.missingConfig.join(', ')}</AlertDescription>
              </AlertContent>
            </Alert>
          )}

          {connection && <TokenHealthAlert tokenHealth={connection.tokenHealth} />}

          <div className="grid gap-4 md:grid-cols-3">
            <DetailItem label="Environment" value={status.environment} />
            <DetailItem label="Minor version" value={status.minorVersion} />
            <DetailItem label="Realm ID" value={connection?.realmId ?? '-'} />
          </div>

          <Separator />

          {connection ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailItem label="Company" value={connection.companyName ?? 'Connected company'} />
              <DetailItem
                label="Access expires"
                value={formatDateTime(connection.accessTokenExpiresAt)}
              />
              <DetailItem
                label="Refresh expires"
                value={formatDateTime(connection.refreshTokenExpiresAt)}
              />
              <DetailItem label="Connected" value={formatDateTime(connection.createdAt)} />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <Plug className="size-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">No QuickBooks company connected</div>
                <div className="text-xs text-muted-foreground">
                  Connect QuickBooks Online to authorize Elli for the selected company.
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={onConnect}
              disabled={!status.configured || isConnecting || isDisconnecting}
            >
              <Plug className="size-3.5" />
              {connection ? 'Reconnect' : 'Connect'}
            </Button>
            {connection && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDisconnectDialog(true)}
                disabled={isConnecting || isDisconnecting}
              >
                <Power className="size-3.5" />
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect QuickBooks?</AlertDialogTitle>
            <AlertDialogDescription>
              This revokes Elli's QuickBooks OAuth access. You can reconnect from this page any
              time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnectConfirm}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
