import { errorHandler } from '@handler/error';
import { auth } from '@lib/auth';
import { cors_config } from '@lib/cors';
import { performanceMiddleware } from '@middleware';
import { costCodeRoutes } from '@modules/cost-code';
import { userRoutes } from '@modules/user';
import { NotFoundError } from '@utils';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';

import { authMiddleware } from './middleware/auth';
// Initialize Hono app
const app = new Hono();
app.use('*', performanceMiddleware);
app.use('*', cors(cors_config));

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

app.use(
    '/*',
    serveStatic({
        root: './dist/docs',
        rewriteRequestPath: (path) => path.replace(/^\/documentation/, ''),
    })
);

app.use('/*', authMiddleware);

app.route('/api/cost-code', costCodeRoutes);
app.route('/api/users', userRoutes);

// 404 Not Found handler
app.notFound(() => {
    throw new NotFoundError('Not Found');
});
// Global error handler
app.onError(errorHandler);
// Export the app
export default app;
