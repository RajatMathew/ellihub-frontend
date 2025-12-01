# Middleware Guide

This guide covers built-in middleware in Elle Core, including usage, options, and best practices. Study the `example` module for real-world patterns and extension techniques.

## Pagination Middleware

The `paginationMiddleware` is a flexible middleware for parsing and managing pagination, sorting, field selection, searching, and filtering in API endpoints. It extracts relevant query parameters from incoming requests and attaches a standardized `pagination` object to the context, making it easy for handlers to implement paginated data fetching.

### Supported Query Parameters

- `page` (number): The current page number (default: 1)
- `size` (number): Number of items per page (default: configurable)
- `sortBy` (string): Field to sort by (default: configurable)
- `sortOrder` ('asc' | 'desc'): Sort direction (default: configurable)
- `fields` (string[] | string): Fields to include in the response
- `search` (string): Search term for filtering results
- `filter` (JSON string): Advanced filtering (parsed as object)

### Types

#### PaginationParams

```typescript
type PaginationParams = {
  page: number;
  size: number;
  skip: number;
  take: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  fields?: string[];
  search?: string;
  filter?: Record<string, any>;
};
```

#### IPaginationOptions

```typescript
interface IPaginationOptions {
  defaultSize?: number;
  maxSize?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  defaultFields?: string[];
  allowedSortFields?: string[];
}
```

#### IPaginationResponse

```typescript
interface IPaginationResponse {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### Usage

**Basic Example (see `example/routes/pagination_example.route/index.ts`):**

```typescript
import { paginationMiddleware } from '@middleware';

app.get('/', paginationMiddleware({ defaultSize: 5 }), async (c: Context) => {
  const { skip, take } = c.get('pagination');
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
  const paginatedItems = items.slice(skip, skip + take);
  return success(c, paginatedItems, 'Paginated items fetched successfully', items.length);
});
```

**Advanced Example:**

```typescript
app.get(
  '/projects',
  paginationMiddleware({
    defaultSize: 20,
    maxSize: 100,
    defaultSortBy: 'updatedAt',
    defaultSortOrder: 'desc',
    allowedSortFields: ['name', 'updatedAt', 'status'],
    defaultFields: ['id', 'name', 'status'],
  }),
  async (c: Context) => {
    const pagination = c.get('pagination');
    // Use pagination object for DB query
  }
);
```

### How It Works

1. Parses query parameters from the request.
2. Applies defaults and enforces limits (e.g., maxSize).
3. Validates `sortBy` against allowed fields.
4. Parses `fields` and `filter` for advanced selection and filtering.
5. Attaches a `pagination` object to the context for use in handlers.

### Example Paginated Response Structure

```json
{
  "data": [
    /* array of items */
  ],
  "pagination": {
    "currentPage": 2,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPreviousPage": true
  },
  "message": "Paginated items fetched successfully"
}
```

### Best Practices

- Always use pagination for endpoints returning lists to avoid performance issues.
- Restrict `sortBy` to allowed fields for security and consistency.
- Return total item count and pagination metadata for client navigation.
- Document supported query parameters in your API guide.
- Validate and sanitize incoming query parameters.

### Tips

- Combine with other middleware (e.g., authentication, performance) for robust endpoints.
- Use the `fields` parameter to optimize payload size for mobile or bandwidth-constrained clients.
- Leverage the `filter` parameter for advanced querying (e.g., `{ "status": "active" }`).

---

## Performance Middleware

The `performanceMiddleware` records the start time of each request and attaches it to the context. This can be used for logging or measuring request duration in your handlers or other middleware.

**Basic Usage:**

```typescript
import { performanceMiddleware } from '@/middleware/performance';

app.use(performanceMiddleware);
```

**Accessing Start Time:**

```typescript
const startTime = c.get('startTime');
```

**Use Case:**

- Measure and log request duration for performance monitoring
- Combine with other middleware to track slow endpoints

**Example (see `example/routes/` for combining with other middleware):**

```typescript
app.get('/items', performanceMiddleware, async (c: Context) => {
  const start = c.get('startTime');
  // ... handle request ...
  const duration = performance.now() - start;
  console.log(`Request took ${duration}ms`);
});
```
