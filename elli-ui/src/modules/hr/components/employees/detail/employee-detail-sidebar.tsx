import type { ReactNode } from 'react';

import { ActivityPanel, type ActivityPanelItem } from '@/app/components/activity-panel';
import { DetailSidebar } from '@/app/components/detail-sidebar';
import { Separator } from '@/app/components/ui/separator';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import { Mail, MapPin, Phone, User } from 'lucide-react';

interface EmployeeDetailSidebarProps {
  employee: Employee;
  open: boolean;
  activityItems: ActivityPanelItem[];
  isActivityLoading: boolean;
  isActivityError: boolean;
  onClose: () => void;
  onRetryActivity: () => void;
}

export function EmployeeDetailSidebar({
  employee,
  open,
  activityItems,
  isActivityLoading,
  isActivityError,
  onClose,
  onRetryActivity,
}: EmployeeDetailSidebarProps) {
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
      <div className="space-y-4 p-4">
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
    <div className="flex min-w-0 items-center gap-3 text-sm">
      {icon}
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
