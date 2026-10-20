const enabledValues = new Set(['1', 'true', 'yes', 'on']);

const isEnvFlagOn = (value: string | undefined) =>
  enabledValues.has((value ?? '').trim().toLowerCase());

export const isElliotAgentDisabled = isEnvFlagOn(import.meta.env.VITE_DISABLE_ELLIOT_AGENT);

/**
 * Hides Elliot the classifier's reading of a thread: no `GET /elliot/readings`, no blue outline
 * on the details card, no drafted task behind "+ Add task". It does not stop elli-core from
 * reading mail or filing threads — that is `ELLIOT_EMAIL_READING=off` on the API.
 */
export const isElliotClassifierDisabled = isEnvFlagOn(
  import.meta.env.VITE_DISABLE_ELLIOT_CLASSIFIER
);
