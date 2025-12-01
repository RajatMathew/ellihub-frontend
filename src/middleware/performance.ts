// middleware/performance.ts
import type { Context, MiddlewareHandler, Next } from 'hono';

export const performanceMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  const start = performance.now();
  c.set('startTime', start);
  return next();
};
