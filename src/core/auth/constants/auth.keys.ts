export const authKeys = {
  all: ['auth'] as const,
  capabilities: () => [...authKeys.all, 'capabilities'] as const,
};
