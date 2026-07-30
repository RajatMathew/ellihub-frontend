# Temporary Recurring Bills QA Clock

`TEMP_RECURRING_BILLS_QA_CLOCK` is a sandbox-only date override for recurring-bill QA.

Enable it locally with `VITE_ENABLE_RECURRING_BILLS_QA_CLOCK=true`. The control is shown to
dev/admin users while QuickBooks is configured for the sandbox environment.

The control is available in a deployment only when the Vite build-time flag is enabled. It remains
restricted to dev/admin users while QuickBooks is configured for the sandbox environment.

The selected date is stored only in the `recurringQaDate` URL parameter and sent as the
`X-Elli-Recurring-QA-Date` request header. The API response must confirm the override before the UI
shows it as active.

## Removal

1. Revert the dedicated QA-clock changes in `elli-ui` and `elli-core`.
2. Remove both QA-clock environment variables.
3. Search both repositories for `TEMP_RECURRING_BILLS_QA_CLOCK`; it should return no matches.

There is no database migration, persisted QA state, or global browser clock involved.
