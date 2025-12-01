import { ContentfulStatusCode } from 'hono/utils/http-status';

import type { Context } from 'hono';

export function success<T>(
  c: Context,
  data: T | T[],
  message = 'OK',
  count?: number,
  name = 'data',
  status: ContentfulStatusCode = 200
) {
  const path = c.req.path;
  const startTime = c.get('startTime');
  const executionTime = startTime ? performance.now() - startTime : undefined;
  let pagination;
  if (typeof count === 'number' && Array.isArray(data)) {
    const { page = 1, size = data.length } = c.get('pagination') || {};
    pagination = {
      currentPage: page,
      totalPages: Math.ceil(count / size),
      hasNextPage: page * size < count,
      hasPreviousPage: page > 1,
      totalItems: count,
      itemsPerPage: size,
    };
  }
  return c.json(
    {
      success: true,
      message,
      [name]: data,
      pagination,
      path,
      timestamp: new Date().toISOString(),
      timeElapsed: executionTime ? `${executionTime.toFixed(2)} ms` : undefined,
    },
    status
  );
}

export function failure(
  c: Context,
  message: string,
  status: ContentfulStatusCode = 400,
  errors?: unknown
) {
  const path = c.req.path;
  const details = errors || null;
  return c.json(
    {
      success: false,
      message,
      details,
      path,
      timestamp: new Date().toISOString(),
    },
    status
  );
}
