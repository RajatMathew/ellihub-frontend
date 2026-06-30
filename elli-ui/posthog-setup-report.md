<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into ElliHub. PostHog is initialised in `src/index.tsx` using environment variables, and the `PostHogProvider` wraps the entire application so all components can access the client via `usePostHog()`. Users are identified by email on sign-in and the session is reset on sign-out. Fourteen business events are instrumented across authentication, project management, invoice workflow, purchase orders, RFQs, and HR — all using `posthog.capture()` from the `posthog-js` singleton in mutation hooks.

| Event name | Description | File |
|---|---|---|
| `user_signed_in` | User successfully signed in with email and password. | `src/core/auth/pages/signin-page.tsx` |
| `user_signed_out` | User initiated and completed the sign-out flow. | `src/core/auth/pages/sign-out.tsx` |
| `project_created` | A new project was successfully created. | `src/modules/project/hooks/project.hooks.ts` |
| `project_status_changed` | A project's status was changed (active, inactive, closed, or completed). | `src/modules/project/hooks/project.hooks.ts` |
| `invoice_created` | A new invoice was successfully created for a project. | `src/modules/project/hooks/invoice/invoice-crud-mutations.hooks.ts` |
| `invoice_approved` | An invoice was approved in the workflow. | `src/modules/project/hooks/invoice/invoice-workflow-mutations.hooks.ts` |
| `invoice_rejected` | An invoice was rejected in the workflow. | `src/modules/project/hooks/invoice/invoice-workflow-mutations.hooks.ts` |
| `invoice_marked_paid` | An invoice was marked as paid. | `src/modules/project/hooks/invoice/invoice-workflow-mutations.hooks.ts` |
| `invoice_disputed` | An invoice was disputed by a user. | `src/modules/project/hooks/invoice/invoice-workflow-mutations.hooks.ts` |
| `purchase_order_created` | A new purchase order was created for a project. | `src/modules/project/hooks/purchase-order/purchase-order.hooks.ts` |
| `purchase_order_issued` | A purchase order was issued (sent to vendor). | `src/modules/project/hooks/purchase-order/purchase-order.hooks.ts` |
| `rfq_published` | An RFQ was published and made visible to vendors. | `src/modules/project/hooks/rfq/rfq.hooks.ts` |
| `rfq_awarded` | An RFQ quote was awarded to a vendor. | `src/modules/project/hooks/rfq/rfq.hooks.ts` |
| `employee_created` | A new employee record was created in HR. | `src/modules/hr/hooks/employees/use-save-employee.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/491948/dashboard/1779245)
- **Daily sign-ins**: [https://us.posthog.com/project/491948/insights/G0i5StfJ](https://us.posthog.com/project/491948/insights/G0i5StfJ)
- **Projects created over time**: [https://us.posthog.com/project/491948/insights/r3X8TmAy](https://us.posthog.com/project/491948/insights/r3X8TmAy)
- **Invoice workflow funnel**: [https://us.posthog.com/project/491948/insights/TDIjHREU](https://us.posthog.com/project/491948/insights/TDIjHREU)
- **Purchase orders issued vs created**: [https://us.posthog.com/project/491948/insights/l7B6hEhR](https://us.posthog.com/project/491948/insights/l7B6hEhR)
- **RFQ to award conversion**: [https://us.posthog.com/project/491948/insights/04eVomHK](https://us.posthog.com/project/491948/insights/04eVomHK)

## Verify before merging

- [ ] Run a full production build (`bun run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` to `.env.example` and any monorepo bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify in PostHog error tracking.
- [ ] Confirm the returning-visitor path also calls `identify` — currently `identify` is only called on fresh sign-in. If a user returns without signing in again, they will remain on an anonymous distinct ID until their next explicit sign-in.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-react-react-router-7-data/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
