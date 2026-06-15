# Standardized API Responses: Success & Failure

This document describes the `success` and `failure` response utilities for consistent API responses in Elle Core. See `example/routes/` for real usage patterns.

---

## Success Response

The `success` function sends a standardized successful API response. It automatically includes metadata such as pagination, request path, timestamp, and execution time.

### Signature

```typescript
success<T>(
  c: Context,
  data: T | T[],
  message = 'OK',
  count?: number,
  name = 'data',
  status: ContentfulStatusCode = 200
)
```

### Parameters

- `c`: Hono context object
- `data`: The response data (object or array)
- `message`: Optional message (default: 'OK')
- `count`: Optional total count (for paginated lists)
- `name`: Optional key name for data (default: 'data')
- `status`: HTTP status code (default: 200)

### Features

- Adds pagination metadata if `count` and array data are provided
- Includes request path and timestamp
- Optionally includes execution time if `startTime` is set in context

### Example (see `example/routes/pagination_example.route/index.ts`):

```typescript
app.get('/', paginationMiddleware({ defaultSize: 5 }), async (c: Context) => {
  const { skip, take } = c.get('pagination');
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
  const paginatedItems = items.slice(skip, skip + take);
  return success(c, paginatedItems, 'Paginated items fetched successfully', items.length);
});
```

#### Example Response

```json
{
  "success": true,
  "message": "Fetched items",
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "totalItems": 100,
    "itemsPerPage": 20
  },
  "path": "/api/items",
  "timestamp": "2025-12-02T12:00:00.000Z",
  "timeElapsed": "5.23 ms"
}
```

---

## Failure Response

The `failure` function sends a standardized error response. It ensures all error responses have a consistent structure, including error details, request path, and timestamp.

### Signature

```typescript
failure(
  c: Context,
  message: string,
  status: ContentfulStatusCode = 400,
  errors?: unknown
)
```

### Parameters

- `c`: Hono context object
- `message`: Error message
- `status`: HTTP status code (default: 400)
- `errors`: Optional error details (object, array, or string)

### Features

- Includes error details if provided
- Adds request path and timestamp

### Example (see `example/routes/`):

```typescript
app.get('/fail', async (c: Context) => {
  return failure(c, 'Invalid request', 422, { field: 'name', error: 'Required' });
});
```

#### Example Response

```json
{
  "success": false,
  "message": "Invalid request",
  "details": { "field": "name", "error": "Required" },
  "path": "/api/items",
  "timestamp": "2025-12-02T12:00:00.000Z"
}
```
