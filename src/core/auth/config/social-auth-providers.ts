import type { ComponentType, SVGProps } from 'react';

import { MicrosoftIcon } from '@/core/auth/components/microsoft-icon';

export type SocialAuthenticationProviderDefinition = {
  id: string;
  displayName: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const SOCIAL_AUTHENTICATION_PROVIDERS = [
  {
    id: 'microsoft',
    displayName: 'Microsoft',
    Icon: MicrosoftIcon,
  },
] as const satisfies readonly SocialAuthenticationProviderDefinition[];

export type SocialAuthenticationProviderId = (typeof SOCIAL_AUTHENTICATION_PROVIDERS)[number]['id'];

const providersById = new Map<string, SocialAuthenticationProviderDefinition>(
  SOCIAL_AUTHENTICATION_PROVIDERS.map((provider) => [provider.id, provider])
);

export function getSocialAuthenticationProvider(
  providerId: string | null | undefined
): SocialAuthenticationProviderDefinition | null {
  if (!providerId) return null;
  return providersById.get(providerId.toLowerCase()) ?? null;
}
