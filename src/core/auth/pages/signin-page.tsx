import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import { signIn, useSession } from '@app/api';
import { Alert, AlertIcon, AlertTitle } from '@app/components/ui/alert';
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

export function SignInPageComponent() {
  const [searchParams] = useSearchParams();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle URL params
  useEffect(() => {
    const pwdReset = searchParams.get('pwd_reset');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (pwdReset === 'success') {
      setSuccessMessage(
        'Your password has been successfully reset. You can now sign in with your new password.'
      );
    }

    if (errorParam) {
      switch (errorParam) {
        case 'auth_callback_failed':
          setError(errorDescription || 'Authentication failed. Please try again.');
          break;
        case 'auth_callback_error':
          setError(
            errorDescription || 'An error occurred during authentication. Please try again.'
          );
          break;
        case 'auth_token_error':
          setError(errorDescription || 'Failed to set authentication session. Please try again.');
          break;
        default:
          setError(errorDescription || 'Authentication error. Please try again.');
      }
    }
  }, [searchParams]);

  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(getSigninSchema()),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const login = async (data: SigninSchemaType) => {
    try {
      await signIn.email(
        {
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
        },
        {
          onSuccess: () => {
            setSuccessMessage('Successfully signed in! Redirecting...');
          },
          onError: (err) => {
            setError(getApiErrorMessage(err, 'Failed to sign in. Please try again.'));
          },
        }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {}, [error]);

  async function onSubmit(values: SigninSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      if (!values.email.trim() || !values.password) {
        setError('Email and password are required');
        setIsProcessing(false);
        return;
      }

      await login(values);
    } catch (err) {
      console.error('Unexpected sign-in error:', err);
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      );
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalidFormSubmit)}
        className="block w-full space-y-5"
      >
        <div className="text-center space-y-1 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Log in with your credentials.
          </p>
        </div>
        <div className="h-12">
          {error && (
            <Alert variant="destructive" appearance="light" onClose={() => setError(null)}>
              <AlertIcon>
                <AlertCircle />
              </AlertIcon>
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}
        </div>

        {successMessage && (
          <Alert appearance="light" onClose={() => setSuccessMessage(null)}>
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>{successMessage}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Your email" {...field} />
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

        <Button type="submit" className="w-full" disabled={isProcessing}>
          {isProcessing ? (
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

export const SignInPage = () => {
  const { isPending, data } = useSession();
  const [searchParams] = useSearchParams();
  const next_param = searchParams.get('next');
  const next = next_param ? decodeURIComponent(next_param) : null;

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoaderCircleIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (data && data.session) return <Navigate to={next || '/'} replace />;

  return <SignInPageComponent />;
};
