import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircleIcon, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { authClient } from '@app/api';
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@app/components/ui/alert';
import { Button } from '@app/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@app/components/ui/form';
import { Input } from '@app/components/ui/input';
import { onInvalidFormSubmit } from '@app/lib/form-error-toast';
import {
  getMagicLinkRequestErrorMessage,
  MAGIC_LINK_RESEND_COOLDOWN_MS,
  secondsUntil,
} from '@core/auth/lib/magic-link';

const magicLinkRequestSchema = z.object({
  email: z.email('Please enter a valid email address.'),
});

type MagicLinkRequestValues = z.infer<typeof magicLinkRequestSchema>;

interface MagicLinkRequestProps {
  /** Where to land after signing in with the link. */
  next: string;
  onError: (message: string | null) => void;
}

/**
 * Asks for a sign-in link. The answer is the same whether or not the address
 * has an account, so the confirmation says "if".
 */
export function MagicLinkRequest({ next, onError }: MagicLinkRequestProps) {
  const [sending, setSending] = useState(false);
  // A new object on every send, which restarts the resend countdown.
  const [sent, setSent] = useState<{ email: string } | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);

  const form = useForm<MagicLinkRequestValues>({
    resolver: zodResolver(magicLinkRequestSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!sent) return;
    const until = Date.now() + MAGIC_LINK_RESEND_COOLDOWN_MS;
    const timer = window.setInterval(() => {
      const left = secondsUntil(until, Date.now());
      setWaitSeconds(left);
      if (left === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sent]);

  async function send(email: string) {
    setSending(true);
    onError(null);

    try {
      const result = await authClient.signIn.magicLink({ email, metadata: { next } });
      if (result.error) {
        onError(getMagicLinkRequestErrorMessage(result.error.status));
        return;
      }
      setSent({ email });
      setWaitSeconds(MAGIC_LINK_RESEND_COOLDOWN_MS / 1000);
    } catch (error: unknown) {
      console.error('Sign-in link request failed:', error);
      onError(getMagicLinkRequestErrorMessage(undefined));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert appearance="light">
          <AlertIcon>
            <MailCheck />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription>
              If {sent.email} belongs to an ElliHub account, a sign-in link is on its way. It works
              once, expires shortly, and replaces any link sent before.
            </AlertDescription>
          </AlertContent>
        </Alert>

        {/* Every cause, never which one applies: the answer is the same for any address. */}
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t get it in a few minutes? Check the address and your junk folder, or ask an
          administrator to confirm your account.
        </p>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={sending || waitSeconds > 0}
          onClick={() => void send(sent.email)}
        >
          {waitSeconds > 0 ? `Send again in ${waitSeconds}s` : 'Send again'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setSent(null);
            onError(null);
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => send(values.email), onInvalidFormSubmit)}
        className="block w-full space-y-5"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Your email" type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full h-10 text-sm" disabled={sending}>
          {sending ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Sending...
            </span>
          ) : (
            'Email me a sign-in link'
          )}
        </Button>
      </form>
    </Form>
  );
}
