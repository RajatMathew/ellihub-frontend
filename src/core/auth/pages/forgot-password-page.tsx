import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, LoaderCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { requestPasswordReset } from '@app/api';
import { Alert, AlertIcon, AlertTitle } from '@app/components/ui/alert';
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

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordForm) {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await requestPasswordReset({
        email: values.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to send reset email.');
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalidFormSubmit)}
        className="block w-full space-y-5"
      >
        <div className="space-y-1 pb-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we will send a secure reset link.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" appearance="light" onClose={() => setError(null)}>
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {sent && (
          <Alert appearance="light">
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>
              If that email exists, a password reset link has been sent.
            </AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@company.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isProcessing}>
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Sending...
            </span>
          ) : (
            'Send Reset Link'
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Remembered it?{' '}
          <Link to="/sign-in" className="font-semibold text-foreground hover:text-primary">
            Sign In
          </Link>
        </div>
      </form>
    </Form>
  );
}
