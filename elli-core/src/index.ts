import { readFileSync } from 'fs';
import { join } from 'path';

import v1 from '@api/V1';
import { errorHandler } from '@handler/error';
import { swaggerUI } from '@hono/swagger-ui';
import { cors_config } from '@lib/cors';
import { startScheduler } from '@lib/scheduler';
import { performanceMiddleware } from '@middleware';
import { NotFoundError } from '@utils';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
// Initialize Hono app
const app = new Hono();
app.use('*', performanceMiddleware);
app.use('*', logger());
app.use('*', cors(cors_config));

// Serve OpenAPI JSON
app.get('/api-doc.json', (c) => {
    try {
        const docPath = join(import.meta.dir, '..', 'dist', 'api-doc.json');
        const doc = readFileSync(docPath, 'utf-8');
        return c.json(JSON.parse(doc));
    } catch {
        return c.json(
            { error: 'API documentation not built. Run: bun run scripts/build-openapi.ts' },
            404
        );
    }
});

// Swagger UI
app.get('/api-docs', swaggerUI({ url: '/api-doc.json' }));

app.route('/api/v1', v1);

startScheduler();

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
