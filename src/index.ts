import { errorHandler } from '@handler/error';
import { auth } from '@lib/auth';
import { performanceMiddleware } from '@middleware';
import { costCodeRoutes } from '@modules/cost-code';
import { NotFoundError } from '@utils';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { showRoutes } from 'hono/dev';
// Initialize Hono app
const app = new Hono();
app.use('*', performanceMiddleware);

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

showRoutes(app, {
    verbose: true,
    colorize: true,
});

app.use(
    '/*',
    serveStatic({
        root: './dist/docs',
        rewriteRequestPath: (path) => path.replace(/^\/documentation/, ''),
    })
);

app.route('/api/cost-code', costCodeRoutes);

// 404 Not Found handler
app.notFound(() => {
    throw new NotFoundError('Not Found');
});
// Global error handler
app.onError(errorHandler);
// Export the app
export default app;
