const enabledValues = new Set(['1', 'true', 'yes', 'on']);

export const isElliotAgentDisabled = enabledValues.has(
  (import.meta.env.VITE_DISABLE_ELLIOT_AGENT ?? '').trim().toLowerCase()
);
