# Elle Core API Design Guide

This guide provides a professional, practical overview of the patterns and principles for building modular, scalable APIs in Elle Core. It is designed to help developers confidently create new modules and extend existing ones, using proven best practices for structure, separation of concerns, and maintainability. The `example` module demonstrates these patterns, but this guide focuses on the underlying concepts you should apply to your own features.

## 1. Module Structure

**Principle:** Each module represents a backend domain or a database schema (such as a table or feature area). Modules are self-contained, making your codebase easier to maintain, test, and extend.

**Typical Module Structure:**

- `index.ts`: Exports routers for each route pattern.
- `routes/`: Route definitions, usually implementing CRUD (Create, Read, Update, Delete) for a table or API, plus any additional endpoints needed for business logic.
- `models/`: Zod schemas for query, params, and body validation.
- `service/`: Business logic, database queries, and helpers.

**Tip:** Keep modules focused and independent. Share code only through router mounting or common utilities. Each route should correspond to a specific API operation—most commonly CRUD for a table, but you can add custom endpoints for extra capabilities (e.g., search, bulk actions, analytics).

## 2. Route Definitions

**Principle:** Define endpoints using a router (e.g., Hono) for each module. Group related endpoints together for clarity and maintainability.

**Best Practices:**

- Keep route files small and focused.
- Apply validation and middleware directly in route definitions for flexibility.
- Make routes easy to test and extend.

## 3. Validation

**Principle:** Always validate external input before processing. Centralize validation logic for maintainability and security.

**Best Practices:**

- Use Zod schemas for query, params, and body validation.
- Store all schemas in a dedicated `models/` folder for reuse.
- Use validation middleware (e.g., `zValidator`) to enforce schema checks.

## 4. Middleware

**Principle:** Middleware handles cross-cutting concerns like pagination, authentication, and performance. Compose middleware in your routes for maximum flexibility.

**Best Practices:**

- Use built-in and custom middleware to keep route logic clean.
- Document custom middleware for future contributors.

See [Middleware Guide](./middleware.md) for more details.

## 5. Service Layer

**Principle:** Keep business logic separate from routing. This makes your code easier to test, reuse, and maintain.

**Best Practices:**

- Place all business logic, database queries, and helpers in the `service/` folder.
- Services should be pure and decoupled from route logic.
- Handle all data access, transformation, and error throwing in services.

## 6. Response Handling

**Principle:** Consistent, standardized responses make APIs easier to consume and debug.

**Best Practices:**

- Use utilities like `success` and `failure` for all API responses.
- Always return a predictable response shape for both success and error cases.
- Include useful metadata (pagination, timestamps, etc.) when relevant.

See [Response Handling](./response.md) for more.

## 7. Utility Functions

**Principle:** Centralize common logic for validation, error handling, and response formatting in a shared `utils/` folder.

**Best Practices:**

- Use and extend utility functions for consistency and maintainability.
- Document utility usage for your team and future contributors.

See [Common Utility Functions](./utils.md) for details.

## 8. Error Handling

**Principle:** Robust error handling improves reliability and developer experience.

**Best Practices:**

- Use custom error classes for different error scenarios (validation, not found, unauthorized, etc.).
- Throw errors in services and catch them in route handlers or error middleware.
- Always return meaningful, consistent error responses to clients.

See [Error Handling Guide](./error-handling.md) for more.

## 9. Example Patterns (Abstract)

### Detailed Route Pattern Examples

Below are practical code examples for common route patterns in Elle Core modules. These patterns can be adapted for any table, schema, or API feature.

#### 1. CRUD Endpoints for a Table

```typescript
// src/modules/user/routes/user.route.ts
import { Hono } from 'hono';
import { zValidator } from '@utils';
import { userCreateSchema, userUpdateSchema, userIdSchema } from '../models/user';
import * as userService from '../service/user';

const app = new Hono();

// Create
app.post('/', zValidator('json', userCreateSchema), async (c) => {
    const data = c.req.valid('json');
    const user = await userService.createUser(data);
    return success(c, user, 'User created');
});

// Read (single)
app.get('/:id', zValidator('param', userIdSchema), async (c) => {
    const { id } = c.req.valid('param');
    const user = await userService.getUserById(id);
    return success(c, user, 'User fetched');
});

// Update
app.put(
    '/:id',
    zValidator('param', userIdSchema),
    zValidator('json', userUpdateSchema),
    async (c) => {
        const { id } = c.req.valid('param');
        const data = c.req.valid('json');
        const user = await userService.updateUser(id, data);
        return success(c, user, 'User updated');
    }
);

// Delete
app.delete('/:id', zValidator('param', userIdSchema), async (c) => {
    const { id } = c.req.valid('param');
    await userService.deleteUser(id);
    return success(c, null, 'User deleted');
});

export default app;
```

#### 2. Validation Example

```typescript
// src/modules/user/models/user.ts
import { z } from 'zod';

export const userCreateSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
});

export const userUpdateSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
});

export const userIdSchema = z.object({
    id: z.string().uuid(),
});
```

#### 3. Pagination Example

```typescript
// src/modules/user/routes/user.route.ts
import { paginationMiddleware } from '@middleware/pagination';

app.get('/', paginationMiddleware({ defaultSize: 10 }), async (c) => {
    const pagination = c.get('pagination');
    const { data, count } = await userService.getUsersPaginated(pagination);
    return success(c, data, 'Users fetched', count);
});
```

#### 4. Custom Endpoint Example (Search)

```typescript
app.get('/search', zValidator('query', z.object({ q: z.string().min(1) })), async (c) => {
    const { q } = c.req.valid('query');
    const results = await userService.searchUsers(q);
    return success(c, results, 'Search results');
});
```

#### 5. Error Handling Example

```typescript
// src/modules/user/service/user.ts
import { NotFoundError } from '@utils';

export async function getUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');
    return user;
}
```

---

By following these patterns and adapting the examples above, you will build Elle Core modules that are professional, maintainable, and easy for any developer to understand and extend.
