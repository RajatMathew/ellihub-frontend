# Error Handling Guide

This guide explains error handling in Elle Core, including available error classes and best practices. Study the `example` module for service-layer error handling and extension patterns.

## Error Throw Classes

Use custom error classes from `@/utils` to handle different error scenarios in your API logic. These classes extend the base `Error` class and set a specific error name for easier identification and handling.

**Available Error Classes:**

- `BadRequestError`
- `UnauthorizedError`
- `ForbiddenError`
- `NotFoundError`
- `ConflictError`
- `InternalServerError`
- `TooManyRequestsError`

**Example Usage in Service Layer (see `example/service/example.ts`):**

```typescript
import { NotFoundError, BadRequestError } from '@utils';

export const findOneProject = async ({ id }: { id: string }) => {
  if (!id) {
    throw new BadRequestError('ID is required');
  }
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new NotFoundError('Project not found');
  }
  return project;
};
```

## Best Practices

- Throw specific error classes for different scenarios
- Catch errors in route handlers and return meaningful responses
- Log errors for debugging and monitoring
