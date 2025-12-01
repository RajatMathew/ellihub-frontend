import apiV1 from '@api/V1';
import apiV2 from '@api/V2';
import { errorHandler } from '@handler/error';
import { performanceMiddleware } from '@middleware';
import { NotFoundError } from '@utils';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
// Initialize Hono app
const app = new Hono();
app.use('*', performanceMiddleware);
//  API versions
app.route('/api/v1', apiV1);
app.route('/api/v2', apiV2);
// Documentation serving
app.use(
  '/*',
  serveStatic({
    root: './dist/docs',
    rewriteRequestPath: (path) => path.replace(/^\/documentation/, ''),
  })
);
// 404 Not Found handler
app.notFound((c) => {
  throw new NotFoundError('Not Found');
});
// Global error handler
app.onError(errorHandler);
// Export the app
export default app;
