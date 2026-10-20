export const quickShortcutsKeys = {
  all: ['quick-shortcuts'] as const,
  list: () => [...quickShortcutsKeys.all, 'list'] as const,
};
