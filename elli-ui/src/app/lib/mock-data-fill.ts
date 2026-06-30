const enabledValues = new Set(['1', 'true', 'yes', 'on']);

export const isMockDataFillEnabled = enabledValues.has(
  (import.meta.env.VITE_ENABLE_MOCK_DATA_FILL ?? '').trim().toLowerCase()
);
