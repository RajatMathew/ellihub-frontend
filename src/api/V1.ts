import { auth } from '@lib/auth';
import { contactRoutes } from '@modules/contact';
import { costCodeRoutes } from '@modules/cost-code';
import { fileRoutes } from '@modules/file';
import { generalContractorRoutes } from '@modules/general-contractor';
import { employeeRoutes } from '@modules/hr/employee';
import { invoiceRoutes } from '@modules/invoice';
import { pcoRoutes } from '@modules/pco';
import { poRoutes } from '@modules/po';
import { projectRoutes } from '@modules/project';
import { rfqRoutes } from '@modules/rfq';
import { scoRoutes } from '@modules/sco';
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
app.route('/invoices', invoiceRoutes);
app.route('/pcos', pcoRoutes);
app.route('/pos', poRoutes);
app.route('/projects', projectRoutes);
app.route('/rfqs', rfqRoutes);
app.route('/scos', scoRoutes);
app.route('/vendors', vendorRoutes);
app.route('/users', userRoutes);
app.route('/file', fileRoutes);
app.route('/hr/employee', employeeRoutes);

export default app;
