export const synchronizationKeys = {
  all: ['synchronization'] as const,
  fieldwire: () => [...synchronizationKeys.all, 'fieldwire'] as const,
  fieldwireStatus: () => [...synchronizationKeys.fieldwire(), 'status'] as const,
};
