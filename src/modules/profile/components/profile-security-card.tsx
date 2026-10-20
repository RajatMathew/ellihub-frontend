import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
  CardTitle,
} from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { hasPasswordAccount, isPasswordSignInEnabled } from '@/core/auth/lib/password-sign-in';
import { ProfileChangePasswordForm } from '@/modules/profile/components/profile-change-password-form';
import { ProfileConnectedAccounts } from '@/modules/profile/components/profile-connected-accounts';
import { ProfileSetPassword } from '@/modules/profile/components/profile-set-password';
import { useAuthenticationMethodsQuery } from '@/modules/profile/hooks/profile.hooks';
import { getPasswordSectionState } from '@/modules/profile/lib/password-section';

export function ProfileSecurityCard() {
  // The same query the connected accounts read, so one request serves both.
  const methodsQuery = useAuthenticationMethodsQuery();
  const passwordSection = getPasswordSectionState({
    status: methodsQuery.status,
    passwordEnabled: isPasswordSignInEnabled(methodsQuery.data?.capabilities),
    hasPassword: hasPasswordAccount(methodsQuery.data?.accounts ?? []),
  });

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage how you sign in and your active sessions.</CardDescription>
        </CardHeading>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProfileConnectedAccounts />

        {passwordSection === 'loading' && (
          <Skeleton className="h-24 w-full" role="status" aria-label="Loading password settings" />
        )}
        {passwordSection === 'change' && <ProfileChangePasswordForm />}
        {passwordSection === 'set' && <ProfileSetPassword />}
      </CardContent>
    </Card>
  );
}
