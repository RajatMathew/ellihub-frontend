import 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    pagination: PaginationParams;
  }
}
