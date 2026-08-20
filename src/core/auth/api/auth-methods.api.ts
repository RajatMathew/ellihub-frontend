import api, { authClient } from '@/app/api';
import { z } from 'zod';

const authCapabilitiesSchema = z.object({
  providers: z.record(z.string(), z.boolean()),
});

export type AuthCapabilities = z.infer<typeof authCapabilitiesSchema>;

export async function getAuthCapabilities(): Promise<AuthCapabilities> {
  const response = await api.get('/auth/config');
  return authCapabilitiesSchema.parse(response.data);
}

export async function listAuthenticationAccounts() {
  const result = await authClient.listAccounts();

  if (result.error) throw result.error;
  return result.data ?? [];
}

export type AuthenticationAccount = Awaited<ReturnType<typeof listAuthenticationAccounts>>[number];

export async function linkSocialAccount(
  provider: string,
  callbackURL: string,
  errorCallbackURL: string
) {
  const result = await authClient.linkSocial({
    provider,
    callbackURL,
    errorCallbackURL,
  });

  if (result.error) throw result.error;
  return result.data;
}
