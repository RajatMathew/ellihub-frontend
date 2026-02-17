import { auth } from '@lib/auth';
import { contactRoutes } from '@modules/contact';
import { costCodeRoutes } from '@modules/cost-code';
import { fileRoutes } from '@modules/file';
import { generalContractorRoutes } from '@modules/general-contractor';
import { userRoutes } from '@modules/user';
import { vendorRoutes } from '@modules/vendor';
import { Hono } from 'hono';
import { authMiddleware } from 'src/middleware/auth';

const app = new Hono();

app.on(['POST', 'GET'], '/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

app.use('/*', authMiddleware);

app.route('/contacts', contactRoutes);
app.route('/cost-code', costCodeRoutes);
app.route('/general-contractors', generalContractorRoutes);
app.route('/vendors', vendorRoutes);
app.route('/users', userRoutes);
app.route('/file', fileRoutes);

export default app;
