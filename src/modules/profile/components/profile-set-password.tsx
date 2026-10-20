import { useState } from 'react';

import { requestPasswordReset, useSession } from '@/app/api';
import { Button } from '@/app/components/ui/button';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { MailCheck } from 'lucide-react';
import { toast } from 'sonner';

/**
 * For an account created without a password. Setting one goes through the
 * emailed reset link rather than a form here: Better Auth's reset creates the
 * password when there is none, and the email proves the mailbox is theirs.
 */
export function ProfileSetPassword() {
  const { data } = useSession();
  const email = data?.user.email;
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendLink() {
    if (!email) return;
    setSending(true);
    try {
      const result = await requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) throw new Error(result.error.message || 'Failed to send the link.');
      setSent(true);
      toast.success('Check your email for a link to set your password.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to send the link.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Password</h3>
        <p className="text-xs text-muted-foreground">
          You sign in without a password. To set one, we will email you a link to choose it. Setting
          it signs you out of your other sessions.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!email || sending || sent}
        onClick={() => void sendLink()}
      >
        <MailCheck className="size-4" />
        {sent ? 'Link sent' : sending ? 'Sending...' : 'Email me a link to set a password'}
      </Button>
    </div>
  );
}
