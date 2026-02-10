import { auth } from '@lib/auth';
import { costCodeRoutes } from '@modules/cost-code';
import { userRoutes } from '@modules/user';
import { Hono } from 'hono';
import { authMiddleware } from 'src/middleware/auth';

const app = new Hono();

app.on(['POST', 'GET'], '/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

app.use('/*', authMiddleware);

app.route('/cost-code', costCodeRoutes);
app.route('/users', userRoutes);

export default app;
