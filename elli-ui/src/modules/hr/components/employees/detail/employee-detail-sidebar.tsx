import type { ReactNode } from 'react';

import { ActivityPanel, type ActivityPanelItem } from '@/app/components/activity-panel';
import { DetailSidebar } from '@/app/components/detail-sidebar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import { Mail, MapPin, Phone, User, UserCheck, UserPlus, UserX } from 'lucide-react';

interface EmployeeDetailSidebarProps {
  employee: Employee;
  open: boolean;
  activityItems: ActivityPanelItem[];
  isActivityLoading: boolean;
  isActivityError: boolean;
  onClose: () => void;
  onRetryActivity: () => void;
  onLinkUser: () => void;
  onUnlinkUser: () => void;
}

export function EmployeeDetailSidebar({
  employee,
  open,
  activityItems,
  isActivityLoading,
  isActivityError,
  onClose,
  onRetryActivity,
  onLinkUser,
  onUnlinkUser,
}: EmployeeDetailSidebarProps) {
  const hasUserAccount = Boolean(employee.userId);

  return (
    <DetailSidebar
      open={open}
      onClose={onClose}
      activityChildren={
        <ActivityPanel
          items={activityItems}
          isLoading={isActivityLoading}
          isError={isActivityError}
          onRetry={onRetryActivity}
        />
      }
    >
      <div className="min-w-0 space-y-4 p-4">
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Quick Contact
          </span>
          <div className="space-y-3">
            <ContactLine icon={<Mail className="size-4 text-primary" />} value={employee.email} />
            {employee.phoneNumber && (
              <ContactLine
                icon={<Phone className="size-4 text-success" />}
                value={employee.phoneNumber}
              />
            )}
            <ContactLine
              icon={<MapPin className="size-4 text-destructive" />}
              value={employee.address || 'No address provided'}
            />
          </div>
        </div>
        <Separator />
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            System Access
          </span>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Badge variant={hasUserAccount ? 'success' : 'secondary'} appearance="light">
                {hasUserAccount ? (
                  <UserCheck className="size-3" />
                ) : (
                  <UserX className="size-3" />
                )}
                {hasUserAccount ? 'Linked User' : 'No Auth User'}
              </Badge>
            </div>
            {hasUserAccount ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onUnlinkUser}
              >
                <UserX className="size-4" />
                Unlink User
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onLinkUser}
              >
                <UserPlus className="size-4" />
                Link User
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <div className="pt-4 text-center">
          <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full bg-primary/5">
            <User className="size-10 text-primary/30" />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Employee profile managed by HR system. Account active since{' '}
            {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : 'system init'}
            .
          </p>
        </div>
      </div>
    </DetailSidebar>
  );
}

function ContactLine({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 text-sm">
      {icon}
      <span className="min-w-0 flex-1 break-words">{value}</span>
    </div>
  );
}
