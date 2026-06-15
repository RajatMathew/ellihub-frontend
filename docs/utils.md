# Common Utility Functions

This guide covers the core utility functions provided in Elle Core for error handling, validation, and response formatting.

## Error Utilities

Located in `src/utils/error.ts`, these custom error classes help standardize error handling across your API:

- `BadRequestError`: For invalid requests (400)
- `UnauthorizedError`: For authentication failures (401)
- `ForbiddenError`: For forbidden actions (403)
- `NotFoundError`: For missing resources (404)
- `ConflictError`: For resource conflicts (409)
- `InternalServerError`: For server errors (500)
- `TooManyRequestsError`: For rate limiting (429)

**Usage Example:**

```typescript
import { NotFoundError } from '@utils';

if (!user) {
  throw new NotFoundError('User not found');
}
```

## Validation Utility

Located in `src/utils/zod.ts`, the `zValidator` function wraps Zod schema validation for Hono routes:

```typescript
import { zValidator } from '@utils';
import { querySchema } from './models/query';

app.get('/', zValidator('query', querySchema), async (c) => {
  // ...
});
```

- Throws a ZodError if validation fails, which can be caught by error middleware.

## Response Utilities

See [Response Handling](./response.md) for details on standardized success and error responses using the `success` and `failure` functions.

## How to Use Utilities

- Import from `@utils` (via `src/utils/index.ts`) for easy access to all utilities:
  ```typescript
  import { success, failure, zValidator, NotFoundError } from '@utils';
  ```
- Use error classes for throwing errors in services and controllers.
- Use `zValidator` for request validation in routes.
- Use `success` and `failure` for consistent API responses.

## References in Docs

- [API Guide](./api-guide.md): See sections on validation, error handling, and response handling for usage examples.
- [Error Handling](./error-handling.md): Details on custom error classes and best practices.
- [Response Handling](./response.md): Usage of response utilities.

---

For more patterns, see the updated `example` module (`example/routes/`) and referenced guides above.
