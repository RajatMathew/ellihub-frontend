import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { usePostHog } from '@posthog/react';
import { Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { signIn } from '@app/api';
import { Button } from '@app/components/ui/button';
import { Checkbox } from '@app/components/ui/checkbox';
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
import { getApiErrorMessage } from '@app/lib/toast-api-error';
import { getSigninSchema, type SigninSchemaType } from '@core/auth/forms/signin-schema';

interface PasswordSignInFormProps {
  processing: boolean;
  onProcessingChange: (processing: boolean) => void;
  onError: (message: string | null) => void;
  onSuccess: (message: string) => void;
}

export function PasswordSignInForm({
  processing,
  onProcessingChange,
  onError,
  onSuccess,
}: PasswordSignInFormProps) {
  const posthog = usePostHog();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(getSigninSchema()),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  async function onSubmit(values: SigninSchemaType) {
    onError(null);

    if (!values.email.trim() || !values.password) {
      onError('Email and password are required');
      return;
    }

    onProcessingChange(true);
    try {
      await signIn.email(
        {
          email: values.email,
          password: values.password,
          rememberMe: values.rememberMe,
        },
        {
          onSuccess: () => {
            posthog.identify(values.email);
            posthog.capture('user_signed_in');
            onSuccess('Successfully signed in! Redirecting...');
          },
          onError: (err) => {
            onError(getApiErrorMessage(err, 'Failed to sign in. Please try again.'));
          },
        }
      );
    } catch (err: unknown) {
      console.error('Unexpected sign-in error:', err);
      onError(
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      onProcessingChange(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalidFormSubmit)}
        className="block w-full space-y-5"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Your email" autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <Input
                  placeholder="Your password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...field}
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">Remember me</FormLabel>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-foreground hover:text-primary"
                >
                  Forgot Password?
                </Link>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full h-10 text-sm" disabled={processing}>
          {processing ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </Form>
  );
}
