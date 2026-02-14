import v1 from '@api/V1';
import { errorHandler } from '@handler/error';
import { cors_config } from '@lib/cors';
import { performanceMiddleware } from '@middleware';
import { NotFoundError } from '@utils';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';
// Initialize Hono app
const app = new Hono();
app.use('*', performanceMiddleware);
app.use('*', cors(cors_config));

app.route('/api/v1', v1);

app.use(
    '/*',
    serveStatic({
        root: './dist/docs',
        rewriteRequestPath: (path) => path.replace(/^\/documentation/, ''),
    })
);

// 404 Not Found handler
app.notFound(() => {
    throw new NotFoundError('Not Found');
});
// Global error handler
app.onError(errorHandler);
// Export the app
export default app;
