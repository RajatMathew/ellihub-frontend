import { auth } from '@lib/auth';
import { contactRoutes } from '@modules/contact';
import { costCodeRoutes } from '@modules/cost-code';
import { employeeRoutes } from '@modules/employee';
import { fileRoutes } from '@modules/file';
import { gcRoutes } from '@modules/gc';
import { lookupRoutes } from '@modules/lookup';
import { seederRoutes } from '@modules/seeder';
import { userRoutes } from '@modules/user';
import { vendorRoutes } from '@modules/vendor';
import { Hono } from 'hono';
import { authMiddleware } from 'src/middleware/auth';

const app = new Hono();

app.on(['POST', 'GET'], '/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

app.route('/seed', seederRoutes);

app.use('/*', authMiddleware);

app.route('/cost-code', costCodeRoutes);
app.route('/users', userRoutes);
app.route('/file', fileRoutes);
app.route('/hr/employee', employeeRoutes);
app.route('/lookup', lookupRoutes);
app.route('/vendor', vendorRoutes);
app.route('/gc', gcRoutes);
app.route('/contact', contactRoutes);

export default app;
