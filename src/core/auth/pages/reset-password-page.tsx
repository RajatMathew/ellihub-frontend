import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { resetPassword } from '@app/api';
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

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const errorParam = searchParams.get('error');
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? 'This reset link is invalid or expired.' : null
  );

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordForm) {
    if (!token) {
      setError('This reset link is invalid or expired.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await resetPassword({
        newPassword: values.newPassword,
        token,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to reset password.');
      }

      navigate('/sign-in?pwd_reset=success', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
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
          <h1 className="text-2xl font-semibold tracking-tight">Choose New Password</h1>
          <p className="text-sm text-muted-foreground">
            Enter a new password for your ElliHub account.
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

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="New password"
                    type={passwordVisible ? 'text' : 'password'}
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    mode="icon"
                    onClick={() => setPasswordVisible((prev) => !prev)}
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  >
                    {passwordVisible ? (
                      <EyeOff className="text-muted-foreground" />
                    ) : (
                      <Eye className="text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  placeholder="Confirm password"
                  type={passwordVisible ? 'text' : 'password'}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isProcessing || !token}>
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Saving...
            </span>
          ) : (
            'Reset Password'
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Need a new link?{' '}
          <Link to="/forgot-password" className="font-semibold text-foreground hover:text-primary">
            Request Reset
          </Link>
        </div>
      </form>
    </Form>
  );
}
