export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  authenticationMethods: () => [...profileKeys.all, 'authentication-methods'] as const,
};
